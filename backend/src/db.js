import dns from 'node:dns'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

dns.setDefaultResultOrder('ipv4first')

const connectionString = process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL

const pool = new Pool({
  connectionString,
  family: 4,
  ssl: { rejectUnauthorized: false },  // this is required for Supabase

  // Connection pool settings
  max:             10,   // max 10 simultaneous connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection failed:', err.message)
    return
  }
  console.log('✓ Database connected')
  release()
})

export default pool