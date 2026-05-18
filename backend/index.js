import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import dotenv from 'dotenv'

import errorHandler from './src/middleware/errorHandler.js'
import pool from './src/db.js'
import cpiRouter from './src/routes/cpi.js'
import wpiRouter from './src/routes/wpi.js'
import wriRouter from './src/routes/wri.js'
import wagesRouter from './src/routes/wages.js'
import statesRouter from './src/routes/states.js'
import pricesRouter from './src/routes/prices.js'

dotenv.config()

const app = express()

// ── Middleware ─────────────────────────────────────────────
app.use(helmet())        // security headers
app.use(cors())          // allow React frontend to call this API
app.use(compression())   // gzip responses
app.use(express.json())

// Logging — show every request in terminal
app.use(morgan(
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
))

// ── Routes ─────────────────────────────────────────────────
app.use('/api/cpi', cpiRouter)
app.use('/api/wpi', wpiRouter)
app.use('/api/wri', wriRouter)
app.use('/api/wages', wagesRouter)
app.use('/api/states', statesRouter)
app.use('/api/prices', pricesRouter)

// ── Health check ───────────────────────────────────────────
// n8n pings this every 5 mins to keep Render awake
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({
      status:   'ok',
      database: 'connected',
      time:     new Date().toISOString()
    })
  } catch (err) {
    res.status(503).json({
      status:   'degraded',
      database: 'disconnected',
      error:    err.message
    })
  }
})

// ── API overview ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name:    'India Inflation Monitor API',
    version: '1.0.0',
    endpoints: {
      cpi:    '/api/cpi',
      wpi:    '/api/wpi',
      wri:    '/api/wri',
      wages:  '/api/wages',
      states: '/api/states',
      prices: '/api/prices',
      health: '/health'
    }
  })
})

// ── 404 handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error:     'Endpoint not found',
    requested: req.originalUrl,
    available: [
      '/api/cpi', '/api/wpi', '/api/wri',
      '/api/wages', '/api/states', '/api/prices', '/health'
    ]
  })
})

// ── Global error handler ────────────────────────────────────
app.use(errorHandler)

// ── Start server ────────────────────────────────────────────
const PORT = process.env.PORT || 8000

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║  India Inflation Monitor API          ║
  ║  Running on port ${PORT}                 ║
  ║  http://localhost:${PORT}                ║
  ╚═══════════════════════════════════════╝
  `)
})