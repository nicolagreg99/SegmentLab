'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { GpxPoint } from '@/types'

interface TrackMapProps {
  points: GpxPoint[]
}

export function TrackMap({ points }: TrackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return

    const coords = points.map(p => [p.lng, p.lat] as [number, number])

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: coords[Math.floor(coords.length / 2)],
      zoom: 12,
      attributionControl: false, 
    })

    mapRef.current = map

    map.on('load', () => {
      // Traccia
      map.addSource('track', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {},
        },
      })

      map.addLayer({
        id: 'track-line',
        type: 'line',
        source: 'track',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#3b82f6', 'line-width': 3 },
      })

      // Punto di partenza
      new maplibregl.Marker({ color: '#22c55e' })
        .setLngLat(coords[0])
        .addTo(map)

      // Punto di arrivo
      new maplibregl.Marker({ color: '#ef4444' })
        .setLngLat(coords[coords.length - 1])
        .addTo(map)

      // Fit bounds sulla traccia
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      )
      map.fitBounds(bounds, { padding: 40 })
    })

    return () => map.remove()
  }, [points])

  return <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />
}