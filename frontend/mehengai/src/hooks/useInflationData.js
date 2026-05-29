/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const CACHE_TTL_MS = 10 * 60 * 1000
const responseCache = new Map()
const inFlightRequests = new Map()

function getCacheKey(endpoint, params) {
  return `${endpoint}::${JSON.stringify(params)}`
}

function readCache(cacheKey) {
  const entry = responseCache.get(cacheKey)

  if (!entry) {
    return null
  }

  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(cacheKey)
    return null
  }

  return entry.data
}

function writeCache(cacheKey, data) {
  responseCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

function requestInflationData(endpoint, params = {}, { forceRefresh = false } = {}) {
  const cacheKey = getCacheKey(endpoint, params)

  if (!forceRefresh) {
    const cached = readCache(cacheKey)

    if (cached !== null) {
      return Promise.resolve(cached)
    }

    const inFlight = inFlightRequests.get(cacheKey)

    if (inFlight) {
      return inFlight
    }
  }

  const request = axios
    .get(`${API}${endpoint}`, { params })
    .then(res => {
      const payload = res.data?.data ?? res.data
      writeCache(cacheKey, payload)
      return payload
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey)
    })

  inFlightRequests.set(cacheKey, request)
  return request
}

export function useInflationData(endpoint, params = {}, options = {}) {
  const { enabled = true } = options
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error,   setError]   = useState(null)

  // Convert params to stable string for dependency tracking
  const paramStr = JSON.stringify(params)

  const fetch = useCallback((options = {}) => {
    const { forceRefresh = false } = options

    setLoading(true)
    setError(null)
    return requestInflationData(endpoint, params, { forceRefresh })
      .then(payload => {
        setData(payload)
        return payload
      })
      .catch(err => {
        setError(err?.response?.data?.error || err?.response?.data?.message || err.message)
        throw err
      })
      .finally(() => setLoading(false))
  }, [endpoint, paramStr])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setError(null)
      setData([])
      return undefined
    }

    let isActive = true

    setLoading(true)
    setError(null)

    requestInflationData(endpoint, params)
      .then(payload => {
        if (isActive) {
          setData(payload)
        }
      })
      .catch(err => {
        if (isActive) {
          setError(err?.response?.data?.error || err?.response?.data?.message || err.message)
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [enabled, fetch])

  return { data, loading, error, refetch: fetch }
}

// For endpoints that return a single object (not array)
export function useInflationSingle(endpoint, params = {}, options = {}) {
  const { enabled = true } = options
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error,   setError]   = useState(null)

  const paramStr = JSON.stringify(params)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setError(null)
      setData(null)
      return undefined
    }

    let isActive = true

    setLoading(true)
    setError(null)

    requestInflationData(endpoint, params)
      .then(payload => {
        if (isActive) {
          setData(payload)
        }
      })
      .catch(err => {
        if (isActive) {
          setError(err?.response?.data?.error || err?.response?.data?.message || err.message)
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [enabled, endpoint, paramStr])

  return { data, loading, error }
}
