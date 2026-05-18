import express from 'express'
import db from '../db.js'

const router = express.Router()

// ──────────────────────────────────────────────────────────
// GET /api/wages/real-growth
// Real wage growth = WRI YoY - CPI YoY
// This is the key metric showing if wages beat inflation
// ──────────────────────────────────────────────────────────
router.get('/real-growth', async (req, res, next) => {
  try {
    const { from = 2016, to = new Date().getFullYear() } = req.query

    const result = await db.query(`
      SELECT
        sector, year, quarter,
        wri_value,
        real_wage_growth,
        status
      FROM wri_data
      WHERE real_wage_growth IS NOT NULL
        AND year BETWEEN $1 AND $2
      ORDER BY year ASC, quarter ASC, sector ASC
    `, [parseInt(from), parseInt(to)])

    res.json({ data: result.rows })

  } catch (err) {
    next(err)
  }
})


// ──────────────────────────────────────────────────────────
// GET /api/wages/purchasing-power
// Latest status: is purchasing power improving or declining?
// Returns a simple signal for the dashboard indicator
// ──────────────────────────────────────────────────────────
router.get('/purchasing-power', async (req, res, next) => {
  try {
    // Get the most recent WRI real wage growth value
    const wri = await db.query(`
      SELECT
        year, quarter,
        real_wage_growth, status
      FROM wri_data
      WHERE real_wage_growth IS NOT NULL
      ORDER BY year DESC, quarter DESC
      LIMIT 1
    `)

    // Get latest CPI YoY
    const cpi = await db.query(`
      SELECT
        month, year,
        value, yoy_change
      FROM cpi_data
      WHERE category = 'General'
        AND segment  = 'combined'
        AND state    = 'National'
      ORDER BY year DESC, month DESC
      LIMIT 1
    `)

    // Get latest WRI
    const wriLatest = await db.query(`
      SELECT DISTINCT ON (sector)
        sector, year, quarter, wri_value
      FROM wri_data
      ORDER BY sector, year DESC, quarter DESC
    `)

    const latestCPI    = cpi.rows[0]    || null
    const latestStatus = wri.rows[0]    || null

    res.json({
      data: {
        cpi_latest:       latestCPI,
        real_wage_latest: latestStatus,
        wri_by_sector:    wriLatest.rows,
        signal: latestStatus?.status || 'unknown'
      }
    })

  } catch (err) {
    next(err)
  }
})

export default router