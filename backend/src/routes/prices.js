import express from 'express'
import db from '../db.js'

const router = express.Router()

// ──────────────────────────────────────────────────────────
// GET /api/prices/cities/list
// All cities available in price tracker
// ──────────────────────────────────────────────────────────
router.get('/cities/list', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT city
      FROM price_tracker
      ORDER BY city ASC
    `)

    res.json({ data: result.rows.map(r => r.city) })

  } catch (err) {
    next(err)
  }
})

// ──────────────────────────────────────────────────────────
// GET /api/prices
// All latest prices across all products and cities
// ──────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT ON (product, city)
        product, city, price, recorded_at
      FROM price_tracker
      ORDER BY product, city, recorded_at DESC
    `)

    res.json({ data: result.rows })

  } catch (err) {
    next(err)
  }
})

// ──────────────────────────────────────────────────────────
// GET /api/prices/:product
// Price trend for one product in one city
//
// Params:  product → petrol | diesel | lpg | milk
// Query:   city    → Delhi | Mumbai etc (default: Delhi)
//          days    → how many days of history (default: 365)
// ──────────────────────────────────────────────────────────
router.get('/:product', async (req, res, next) => {
  try {
    const { product }       = req.params
    const { city  = 'Delhi',
            days  = 365    } = req.query

    const result = await db.query(`
      SELECT price, recorded_at
      FROM price_tracker
      WHERE product    = $1
        AND city       = $2
        AND recorded_at >= CURRENT_DATE - ($3 || ' days')::INTERVAL
      ORDER BY recorded_at ASC
    `, [product, city, parseInt(days)])

    if (result.rows.length === 0) {
      return res.status(404).json({
        error:   'No price data found',
        product,
        city
      })
    }

    // Calculate stats
    const prices   = result.rows.map(r => parseFloat(r.price))
    const latest   = prices[prices.length - 1]
    const previous = prices[prices.length - 2] || latest
    const oldest   = prices[0]

    res.json({
      data: result.rows,
      stats: {
        current:       latest,
        previous:      previous,
        mom_change:    parseFloat((latest - previous).toFixed(2)),
        yoy_change:    parseFloat((latest - oldest).toFixed(2)),
        min:           Math.min(...prices),
        max:           Math.max(...prices),
      },
      meta: { product, city, count: result.rows.length }
    })

  } catch (err) {
    next(err)
  }
})

export default router