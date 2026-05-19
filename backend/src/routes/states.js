import express from 'express'
import db from '../db.js'

const router = express.Router()

// ──────────────────────────────────────────────────────────
// GET /api/states/cpi
// State-wise CPI for the India heatmap
//
// Query params:
//   year  → required e.g. ?year=2024
//   month → required e.g. ?month=3
// ──────────────────────────────────────────────────────────
router.get('/cpi', async (req, res, next) => {
  try {
    const {
      year,
      month,
      category = 'General',
      segment = 'combined'
    } = req.query

    if (!year || !month) {
      return res.status(400).json({
        error: 'year and month are required',
        example: '/api/states/cpi?year=2024&month=3'
      })
    }

    const result = await db.query(`
      SELECT
        state,
        value       AS cpi_value,
        mom_change,
        yoy_change
      FROM cpi_data
      WHERE category = $3
        AND segment  = $4
        AND state   != 'National'
        AND year     = $1
        AND month    = $2
      ORDER BY state ASC
    `, [parseInt(year), parseInt(month), category, segment])

    res.json({
      data:  result.rows,
      count: result.rows.length,
      period: { year: parseInt(year), month: parseInt(month) },
      params: { category, segment }
    })

  } catch (err) {
    next(err)
  }
})


// ──────────────────────────────────────────────────────────
// GET /api/states/list
// All available states in the database
// ──────────────────────────────────────────────────────────
router.get('/list', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT state
      FROM cpi_data
      WHERE state != 'National'
      ORDER BY state ASC
    `)

    res.json({ data: result.rows.map(r => r.state) })

  } catch (err) {
    next(err)
  }
})


// ──────────────────────────────────────────────────────────
// GET /api/states/available-periods
// Which year+month combinations have state-level data
// Used to populate the heatmap date selector
// ──────────────────────────────────────────────────────────
router.get('/available-periods', async (req, res, next) => {
  try {
    const { category = 'General', segment = 'combined' } = req.query

    const result = await db.query(`
      SELECT DISTINCT year, month
      FROM cpi_data
      WHERE category = $1
        AND segment  = $2
        AND state   != 'National'
      ORDER BY year DESC, month DESC
    `, [category, segment])

    res.json({ data: result.rows })

  } catch (err) {
    next(err)
  }
})

export default router