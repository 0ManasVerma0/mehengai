import express from 'express'
import db from '../db.js'

const router = express.Router()

// ──────────────────────────────────────────────────────────
// GET /api/cpi
// Main CPI data with filters
//
// Query params:
//   year     → filter by specific year e.g. ?year=2024
//   segment  → rural | urban | combined (default: combined)
//   category → General | Food | Housing etc (default: General)
//   state    → National | Maharashtra etc (default: National)
//   from     → start year e.g. ?from=2020
//   to       → end year e.g. ?to=2024
// ──────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const {
      year,
      segment = 'combined',
      category = 'General',
      state = 'National',
      from,
      to
    } = req.query

    let query = `
      SELECT
        month, year, category, segment, state,
        value, mom_change, yoy_change, moving_avg
      FROM cpi_data
      WHERE segment = $1
        AND category = $2
        AND state = $3
    `
    const params = [segment, category, state]

    if (year) {
      params.push(parseInt(year))
      query += ` AND year = $${params.length}`
    }

    if (from) {
      params.push(parseInt(from))
      query += ` AND year >= $${params.length}`
    }

    if (to) {
      params.push(parseInt(to))
      query += ` AND year <= $${params.length}`
    }

    query += ' ORDER BY year ASC, month ASC'

    const result = await db.query(query, params)

    res.json({
      data: result.rows,
      count: result.rows.length,
      params: { segment, category, state }
    })
  } catch (err) {
    next(err)
  }
})

// ──────────────────────────────────────────────────────────
// GET /api/cpi/latest
// Most recent CPI values — used for metric cards on dashboard
// ──────────────────────────────────────────────────────────
router.get('/latest', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        month, year, category, segment,
        value, mom_change, yoy_change
      FROM cpi_data
      WHERE category = 'General'
        AND segment = 'combined'
        AND state = 'National'
      ORDER BY year DESC, month DESC
      LIMIT 1
    `)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No CPI data found' })
    }

    res.json({ data: result.rows[0] })
  } catch (err) {
    next(err)
  }
})

// ──────────────────────────────────────────────────────────
// GET /api/cpi/summary
// Returns latest values for all key categories at once
// Used to populate all metric cards in one request
// ──────────────────────────────────────────────────────────
router.get('/summary', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT ON (category, segment)
        category, segment, month, year,
        value, mom_change, yoy_change
      FROM cpi_data
      WHERE state = 'National'
        AND category IN (
          'General', 'Food', 'Non-Food',
          'Housing', 'Fuel & Light',
          'Clothing & Footwear'
        )
      ORDER BY category, segment, year DESC, month DESC
    `)

    res.json({ data: result.rows })
  } catch (err) {
    next(err)
  }
})

// ──────────────────────────────────────────────────────────
// GET /api/cpi/comparison
// Returns both CPI and WPI for the same period
// Used for CPI vs WPI comparison chart
// ──────────────────────────────────────────────────────────
router.get('/comparison', async (req, res, next) => {
  try {
    const {
      segment = 'combined',
      from = 2020,
      to = new Date().getFullYear()
    } = req.query

    const cpi = await db.query(`
      SELECT month, year, value AS cpi_value,
             yoy_change AS cpi_yoy
      FROM cpi_data
      WHERE category = 'General'
        AND segment = $1
        AND state = 'National'
        AND year BETWEEN $2 AND $3
      ORDER BY year, month
    `, [segment, parseInt(from), parseInt(to)])

    const wpi = await db.query(`
      WITH monthly_wpi AS (
        SELECT
          EXTRACT(MONTH FROM recorded_at)::int AS month,
          EXTRACT(YEAR FROM recorded_at)::int AS year,
          ROUND(AVG(price)::numeric, 2) AS wpi_value
        FROM price_tracker
        GROUP BY 1, 2
      )
      SELECT
        month,
        year,
        wpi_value,
        ROUND(
          ((wpi_value - LAG(wpi_value, 12) OVER (ORDER BY year, month))
          / NULLIF(LAG(wpi_value, 12) OVER (ORDER BY year, month), 0)) * 100,
          2
        ) AS wpi_yoy
      FROM monthly_wpi
      WHERE year BETWEEN $1 AND $2
      ORDER BY year, month
    `, [parseInt(from), parseInt(to)])

    const wpiMap = {}
    wpi.rows.forEach(row => {
      wpiMap[`${row.year}-${row.month}`] = row
    })

    const merged = cpi.rows.map(row => {
      const key = `${row.year}-${row.month}`
      const wpiRow = wpiMap[key] || {}
      return {
        month: row.month,
        year: row.year,
        cpi_value: parseFloat(row.cpi_value),
        cpi_yoy: parseFloat(row.cpi_yoy),
        wpi_value: wpiRow.wpi_value ? parseFloat(wpiRow.wpi_value) : null,
        wpi_yoy: wpiRow.wpi_yoy ? parseFloat(wpiRow.wpi_yoy) : null,
      }
    })

    res.json({ data: merged })
  } catch (err) {
    next(err)
  }
})

// ──────────────────────────────────────────────────────────
// GET /api/cpi/categories
// List of all available categories
// ──────────────────────────────────────────────────────────
router.get('/categories', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT category
      FROM cpi_data
      ORDER BY category
    `)

    res.json({
      data: result.rows.map(r => r.category)
    })
  } catch (err) {
    next(err)
  }
})

// ──────────────────────────────────────────────────────────
// GET /api/cpi/years
// List of all years available in the database
// ──────────────────────────────────────────────────────────
router.get('/years', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT year
      FROM cpi_data
      ORDER BY year ASC
    `)

    res.json({
      data: result.rows.map(r => r.year)
    })
  } catch (err) {
    next(err)
  }
})

export default router