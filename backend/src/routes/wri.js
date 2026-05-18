import express from 'express'
import db from '../db.js'

const router = express.Router()

// ──────────────────────────────────────────────────────────
// GET /api/wri
// WRI data — by sector, year, quarter
// ──────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const {
      sector = 'All Sectors',
      from   = 2016,
      to     = new Date().getFullYear()
    } = req.query

    let   query  = `
      SELECT sector, year, quarter,
             wri_value, real_wage_growth, status
      FROM wri_data
      WHERE year BETWEEN $1 AND $2
    `
    const params = [parseInt(from), parseInt(to)]

    if (sector && sector !== 'all') {
      params.push(sector)
      query += ` AND sector = $${params.length}`
    }

    query += ' ORDER BY year ASC, quarter ASC'

    const result = await db.query(query, params)

    res.json({ data: result.rows, count: result.rows.length })

  } catch (err) {
    next(err)
  }
})


// ──────────────────────────────────────────────────────────
// GET /api/wri/latest
// Most recent WRI values across all sectors
// ──────────────────────────────────────────────────────────
router.get('/latest', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT ON (sector)
        sector, year, quarter,
        wri_value, real_wage_growth, status
      FROM wri_data
      ORDER BY sector, year DESC, quarter DESC
    `)

    res.json({ data: result.rows })

  } catch (err) {
    next(err)
  }
})


// ──────────────────────────────────────────────────────────
// GET /api/wri/sectors
// List all available sectors
// ──────────────────────────────────────────────────────────
router.get('/sectors', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT sector
      FROM wri_data
      ORDER BY sector
    `)

    res.json({ data: result.rows.map(r => r.sector) })

  } catch (err) {
    next(err)
  }
})

export default router