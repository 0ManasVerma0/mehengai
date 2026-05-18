import express from 'express'
import db from '../db.js'

const router = express.Router()

// ──────────────────────────────────────────────────────────
// GET /api/wpi
// WPI data with filters
// ──────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const {
      year,
      category = 'All Commodities',
      from,
      to
    } = req.query

    let   query  = `
      SELECT
        EXTRACT(MONTH FROM recorded_at)::int AS month,
        EXTRACT(YEAR FROM recorded_at)::int AS year,
        product AS category,
        price AS value,
        NULL::numeric AS mom_change,
        NULL::numeric AS yoy_change,
        NULL::numeric AS moving_avg
      FROM price_tracker
      WHERE 1 = 1
    `
    const params = []

    if (category && category !== 'All Commodities') {
      params.push(category)
      query += ` AND product = $${params.length}`
    }

    if (year) {
      params.push(parseInt(year))
      query += ` AND EXTRACT(YEAR FROM recorded_at) = $${params.length}`
    }
    if (from) {
      params.push(parseInt(from))
      query += ` AND EXTRACT(YEAR FROM recorded_at) >= $${params.length}`
    }
    if (to) {
      params.push(parseInt(to))
      query += ` AND EXTRACT(YEAR FROM recorded_at) <= $${params.length}`
    }

    query += ' ORDER BY year ASC, month ASC, category ASC'

    const result = await db.query(query, params)

    res.json({ data: result.rows, count: result.rows.length })

  } catch (err) {
    next(err)
  }
})


// ──────────────────────────────────────────────────────────
// GET /api/wpi/latest
// Most recent WPI value
// ──────────────────────────────────────────────────────────
router.get('/latest', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        EXTRACT(MONTH FROM recorded_at)::int AS month,
        EXTRACT(YEAR FROM recorded_at)::int AS year,
        product AS category,
        price AS value,
        NULL::numeric AS mom_change,
        NULL::numeric AS yoy_change
      FROM price_tracker
      ORDER BY recorded_at DESC
      LIMIT 1
    `)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No WPI data found' })
    }

    res.json({ data: result.rows[0] })

  } catch (err) {
    next(err)
  }
})


// ──────────────────────────────────────────────────────────
// GET /api/wpi/categories
// ──────────────────────────────────────────────────────────
router.get('/categories', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT product AS category
      FROM price_tracker
      ORDER BY product
    `)

    res.json({ data: result.rows.map(r => r.category) })

  } catch (err) {
    next(err)
  }
})

export default router