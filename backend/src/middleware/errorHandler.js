function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)

  // Database errors
  if (err.code === '42P01') {
    return res.status(500).json({
      error: 'Database table not found',
      detail: 'Run schema.sql in Supabase first'
    })
  }

  res.status(500).json({
    error:   'Internal server error',
    message: err.message
  })
}

export default errorHandler