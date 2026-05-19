import express from 'express'
import db from '../db.js'

const router = express.Router()

const QUARTER_MONTHS = {
  1: [1, 2, 3],
  2: [4, 5, 6],
  3: [7, 8, 9],
  4: [10, 11, 12],
}

/** CPI category used as regional wage-pressure proxy for each WRI sector. */
const WRI_SECTOR_ALIASES = {
  General: 'All Sector',
  'All Sectors': 'All Sector',
  'All sectors': 'All Sector',
  all: 'all',
}

const CPI_CATEGORY_BY_WRI_SECTOR = {
  'All Sector': 'General',
  'Manufacturing Sector': 'Miscellaneous',
  'Mining Sector': 'Fuel and Light',
  'Plantation Sector': 'Food and Beverages',
}

function normalizeWriSector(sector) {
  return WRI_SECTOR_ALIASES[sector] || sector
}

// ──────────────────────────────────────────────────────────
// GET /api/wri
// WRI data — by sector, year, quarter
// ──────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const {
      sector = 'All Sector',
      from   = 2016,
      to     = new Date().getFullYear()
    } = req.query

    let   query  = `
      SELECT
        w.sector,
        w.year,
        w.quarter,
        w.wri_value,
        COALESCE(
          w.real_wage_growth,
          ROUND((w.yoy_change - c.cpi_yoy)::numeric, 2)
        ) AS real_wage_growth,
        CASE
          WHEN COALESCE(w.real_wage_growth, w.yoy_change - c.cpi_yoy) > 0.5 THEN 'improving'
          WHEN COALESCE(w.real_wage_growth, w.yoy_change - c.cpi_yoy) < -0.5 THEN 'declining'
          ELSE COALESCE(w.status, 'neutral')
        END AS status
      FROM wri_data w
      LEFT JOIN LATERAL (
        SELECT AVG(yoy_change) AS cpi_yoy
        FROM cpi_data
        WHERE category = 'General'
          AND segment = 'combined'
          AND state = 'National'
          AND year = w.year
          AND month = ANY(
            CASE w.quarter
              WHEN 1 THEN ARRAY[1, 2, 3]
              WHEN 2 THEN ARRAY[4, 5, 6]
              WHEN 3 THEN ARRAY[7, 8, 9]
              WHEN 4 THEN ARRAY[10, 11, 12]
              ELSE ARRAY[]::int[]
            END
          )
      ) c ON true
      WHERE w.year BETWEEN $1 AND $2
    `
    const params = [parseInt(from), parseInt(to)]

    const normalizedSector = normalizeWriSector(sector)

    if (normalizedSector && normalizedSector !== 'all') {
      params.push(normalizedSector)
      query += ` AND w.sector = $${params.length}`
    }

    query += ' ORDER BY w.year ASC, w.quarter ASC'

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
      SELECT DISTINCT ON (w.sector)
        w.sector,
        w.year,
        w.quarter,
        w.wri_value,
        COALESCE(
          w.real_wage_growth,
          ROUND((w.yoy_change - c.cpi_yoy)::numeric, 2)
        ) AS real_wage_growth,
        CASE
          WHEN COALESCE(w.real_wage_growth, w.yoy_change - c.cpi_yoy) > 0.5 THEN 'improving'
          WHEN COALESCE(w.real_wage_growth, w.yoy_change - c.cpi_yoy) < -0.5 THEN 'declining'
          ELSE COALESCE(w.status, 'neutral')
        END AS status
      FROM wri_data w
      LEFT JOIN LATERAL (
        SELECT AVG(yoy_change) AS cpi_yoy
        FROM cpi_data
        WHERE category = 'General'
          AND segment = 'combined'
          AND state = 'National'
          AND year = w.year
          AND month = ANY(
            CASE w.quarter
              WHEN 1 THEN ARRAY[1, 2, 3]
              WHEN 2 THEN ARRAY[4, 5, 6]
              WHEN 3 THEN ARRAY[7, 8, 9]
              WHEN 4 THEN ARRAY[10, 11, 12]
              ELSE ARRAY[]::int[]
            END
          )
      ) c ON true
      ORDER BY w.sector, w.year DESC, w.quarter DESC
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


// ──────────────────────────────────────────────────────────
// GET /api/wri/periods
// Available year + quarter combinations (WRI is quarterly through 2024)
// ──────────────────────────────────────────────────────────
router.get('/periods', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT year, quarter
      FROM wri_data
      WHERE quarter IS NOT NULL
      ORDER BY year DESC, quarter DESC
    `)

    res.json({ data: result.rows })
  } catch (err) {
    next(err)
  }
})


// ──────────────────────────────────────────────────────────
// GET /api/wri/heatmap
// National WRI index + state-level CPI YoY proxy for the India map
//
// Query: year, quarter, sector (WRI sector name from DB)
// ──────────────────────────────────────────────────────────
router.get('/heatmap', async (req, res, next) => {
  try {
    const {
      year,
      quarter,
      sector = 'All Sector',
    } = req.query

    if (!year || !quarter) {
      return res.status(400).json({
        error: 'year and quarter are required',
        example: '/api/wri/heatmap?year=2024&quarter=3&sector=All%20Sector',
      })
    }

    const normalizedSector = normalizeWriSector(sector)
    const yearNum = parseInt(year, 10)
    const quarterNum = parseInt(quarter, 10)
    const months = QUARTER_MONTHS[quarterNum]

    if (!months) {
      return res.status(400).json({ error: 'quarter must be between 1 and 4' })
    }

    const wriResult = await db.query(
      `
      SELECT sector, year, quarter, wri_value, real_wage_growth, status
      FROM wri_data
      WHERE year = $1 AND quarter = $2 AND sector = $3
      LIMIT 1
      `,
      [yearNum, quarterNum, normalizedSector],
    )

    const cpiCategory = CPI_CATEGORY_BY_WRI_SECTOR[normalizedSector] || 'General'

    const stateResult = await db.query(
      `
      SELECT
        state,
        ROUND(AVG(yoy_change)::numeric, 2) AS cpi_yoy
      FROM cpi_data
      WHERE category = $1
        AND segment = 'combined'
        AND state != 'National'
        AND year = $2
        AND month = ANY($3::int[])
      GROUP BY state
      ORDER BY state ASC
      `,
      [cpiCategory, yearNum, months],
    )

    const states = stateResult.rows.map((row) => ({
      state: row.state,
      cpi_yoy: row.cpi_yoy != null ? parseFloat(row.cpi_yoy) : null,
    }))

    const wriRow = wriResult.rows[0]
    const national = wriRow
      ? {
          sector: wriRow.sector,
          year: wriRow.year,
          quarter: wriRow.quarter,
          wri_value: wriRow.wri_value != null ? parseFloat(wriRow.wri_value) : null,
          real_wage_growth:
            wriRow.real_wage_growth != null
              ? parseFloat(wriRow.real_wage_growth)
              : null,
          status: wriRow.status,
        }
      : null

    res.json({
      data: {
        period: { year: yearNum, quarter: quarterNum, months },
        sector: normalizedSector,
        cpi_category: cpiCategory,
        national,
        states,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
