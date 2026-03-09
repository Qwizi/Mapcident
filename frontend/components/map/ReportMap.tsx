"use client"

import { useCallback, useRef, useMemo, useEffect } from "react"
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
  useMap,
  type MapRef,
  type MapViewport,
} from "@/components/ui/map"
import type { PinItem, Category } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

export const REPORT_RADIUS_KM = 5

interface UserPosition { lat: number; lng: number }

interface ReportMapProps {
  pinData: PinItem[]
  categories: Category[]
  center: [number, number]
  zoom: number
  userPosition: UserPosition | null
  onViewportChange?: (viewport: MapViewport) => void
  onMapClick?: (lat: number, lng: number) => void
  isAuthenticated: boolean
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Oczekujące",
  in_review: "W weryfikacji",
  resolved: "Rozwiązane",
  rejected: "Odrzucone",
}
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500",
  in_review: "bg-blue-500",
  resolved: "bg-green-500",
  rejected: "bg-red-500",
}

function circlePolygon(lng: number, lat: number, radiusKm: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const pts = 64
  const coords: [number, number][] = []
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * 2 * Math.PI
    const dx = (radiusKm / 111.32) / Math.cos((lat * Math.PI) / 180)
    const dy = radiusKm / 111.32
    coords.push([lng + dx * Math.cos(a), lat + dy * Math.sin(a)])
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} }
}

// Child that uses useMap() for radius circle GeoJSON layer
function RadiusCircle({ userPosition }: { userPosition: UserPosition }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return
    const geoData = circlePolygon(userPosition.lng, userPosition.lat, REPORT_RADIUS_KM)
    const src = map.getSource("gps-radius")
    if (src && "setData" in src) {
      (src as { setData: (d: unknown) => void }).setData(geoData)
      return
    }
    map.addSource("gps-radius", { type: "geojson", data: geoData })
    map.addLayer({
      id: "gps-radius-fill", type: "fill", source: "gps-radius",
      paint: { "fill-color": "#3B82F6", "fill-opacity": 0.07 },
    })
    map.addLayer({
      id: "gps-radius-border", type: "line", source: "gps-radius",
      paint: { "line-color": "#3B82F6", "line-width": 1.5, "line-dasharray": [4, 3] },
    })
  }, [map, isLoaded, userPosition])

  return null
}

// Child that sets up click handler using useMap()
function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const { map, isLoaded } = useMap()
  const callbackRef = useRef(onMapClick)
  callbackRef.current = onMapClick

  useEffect(() => {
    if (!map || !isLoaded) return
    map.getCanvas().style.cursor = "crosshair"
    const handler = (e: maplibregl.MapMouseEvent) => {
      callbackRef.current(e.lngLat.lat, e.lngLat.lng)
    }
    map.on("click", handler)
    return () => {
      map.off("click", handler)
      map.getCanvas().style.cursor = ""
    }
  }, [map, isLoaded])

  return null
}

export function ReportMap({
  pinData, categories, center, zoom, userPosition,
  onViewportChange, onMapClick, isAuthenticated,
}: ReportMapProps) {
  const mapRef = useRef<MapRef>(null)
  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  )

  return (
    <Map
      ref={mapRef}
      theme="dark"
      center={center}
      zoom={zoom}
      onViewportChange={onViewportChange}
      className="h-full w-full"
    >
      <MapControls />

      {/* Click handler for report creation */}
      {isAuthenticated && onMapClick && <ClickHandler onMapClick={onMapClick} />}

      {/* GPS user marker + radius */}
      {userPosition && (
        <>
          <MapMarker longitude={userPosition.lng} latitude={userPosition.lat}>
            <MarkerContent>
              <div className="relative flex items-center justify-center">
                <span className="absolute h-6 w-6 rounded-full bg-blue-400/40 animate-ping" />
                <span className="relative h-3.5 w-3.5 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
              </div>
            </MarkerContent>
            <MarkerPopup>
              <div className="px-3 py-2 text-sm font-medium">Twoja lokalizacja</div>
            </MarkerPopup>
          </MapMarker>
          <RadiusCircle userPosition={userPosition} />
        </>
      )}

      {/* Report pin markers */}
      {pinData.map((pin) => {
        const cat = categoryMap[pin.category_id]
        const color = cat?.color ?? "#6B7280"
        return (
          <MapMarker key={pin.id} longitude={pin.lng} latitude={pin.lat}>
            <MarkerContent>
              <div
                className="h-3.5 w-3.5 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: color }}
              />
            </MarkerContent>
            <MarkerPopup className="min-w-[180px]">
              <div className="p-3 space-y-1.5">
                <p className="font-semibold text-sm">{pin.title}</p>
                {cat && <p className="text-xs text-muted-foreground">{cat.name}</p>}
                <Badge variant="secondary" className={`text-[10px] text-white ${STATUS_COLOR[pin.status] ?? ""}`}>
                  {STATUS_LABEL[pin.status] ?? pin.status}
                </Badge>
              </div>
            </MarkerPopup>
          </MapMarker>
        )
      })}
    </Map>
  )
}
