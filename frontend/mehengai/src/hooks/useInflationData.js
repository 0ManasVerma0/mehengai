/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function useInflationData(endpoint, params = {}) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Convert params to stable string for dependency tracking
  const paramStr = JSON.stringify(params)

  const controllerRef = useRef(null)

  const fetch = useCallback(() => {
    setLoading(true)
    setError(null)
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    axios
      .get(`${API}${endpoint}`, { params, signal: controller.signal })
      .then(res => setData(res.data?.data ?? res.data))
      .catch(err => {
        if (err?.name === 'CanceledError' || err?.message === 'canceled') return
        setError(err?.response?.data?.error || err?.response?.data?.message || err.message)
      })
      .finally(() => setLoading(false))
  }, [endpoint, paramStr])

  useEffect(() => {
    fetch()
    return () => {
      if (controllerRef.current) controllerRef.current.abort()
    }
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// For endpoints that return a single object (not array)
export function useInflationSingle(endpoint, params = {}) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const paramStr = JSON.stringify(params)

  const controllerRef = useRef(null)

  useEffect(() => {
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    axios
      .get(`${API}${endpoint}`, { params, signal: controller.signal })
      .then(res => setData(res.data?.data ?? res.data))
      .catch(err => {
        if (err?.name === 'CanceledError' || err?.message === 'canceled') return
        setError(err?.response?.data?.error || err?.response?.data?.message || err.message)
      })
      .finally(() => setLoading(false))

    return () => {
      if (controllerRef.current) controllerRef.current.abort()
    }
  }, [endpoint, paramStr])

  return { data, loading, error }
}
