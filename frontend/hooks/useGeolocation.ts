"use client"

import { useState, useEffect } from "react"

export interface GeolocationState {
  position: GeolocationPosition | null
  coords: { lat: number; lng: number } | null
  error: GeolocationPositionError | null
  loading: boolean
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    coords: null,
    error: null,
    loading: true,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: { code: 2, message: "Geolokalizacja nie jest obsługiwana", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError,
      }))
      return
    }

    let gotPosition = false

    const onSuccess = (position: GeolocationPosition) => {
      gotPosition = true
      setState({
        position,
        coords: { lat: position.coords.latitude, lng: position.coords.longitude },
        error: null,
        loading: false,
      })
    }

    // Fast initial fix — low accuracy, short timeout
    navigator.geolocation.getCurrentPosition(onSuccess, () => {
      // Ignore getCurrentPosition errors — watchPosition is still running
    }, {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 300000,
    })

    // Watch with high accuracy — this is the main source
    const watchId = navigator.geolocation.watchPosition(onSuccess, (error) => {
      // Only report error if we never got a position
      if (!gotPosition) {
        setState((prev) => ({ ...prev, error, loading: false }))
      }
    }, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000,
    })

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return state
}
