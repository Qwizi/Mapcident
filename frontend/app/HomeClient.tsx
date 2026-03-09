"use client"

import dynamic from "next/dynamic"
import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { LocateFixed, LocateOff } from "lucide-react"
import { getMapDataAction, getReportsAction } from "@/lib/api/reports"
import { ReportList } from "@/components/reports/ReportList"
import { NewReportModal } from "@/components/reports/NewReportModal"
import { useGeolocation } from "@/hooks/useGeolocation"
import { haversineDistance } from "@/lib/geo"
import type { PinItem, Report, Category, HexCell } from "@/lib/types"
import type { MapViewport } from "@/components/ui/map"

const ReportMap = dynamic(
  () => import("@/components/map/ReportMap").then((m) => m.ReportMap),
  { ssr: false }
)
const REPORT_RADIUS_KM = 5
const FALLBACK_CENTER: [number, number] = [21.012, 52.229]

interface HomeClientProps {
  initialReports: Report[]
  initialHexData: HexCell[]
  categories: Category[]
  isAuthenticated: boolean
}

export function HomeClient({
  initialReports,
  initialHexData,
  categories,
  isAuthenticated,
}: HomeClientProps) {
  const [reports, setReports] = useState(initialReports)
  const [pinData, setPinData] = useState<PinItem[]>([])
  const [zoom, setZoom] = useState(12)
  const [modalCoords, setModalCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [listLoading, setListLoading] = useState(false)

  const geo = useGeolocation()
  const geoToastShown = useRef(false)

  // Load pin data on mount
  useEffect(() => {
    getMapDataAction("pins").then((pins) => setPinData(pins as PinItem[]))
  }, [])

  // GPS toast once
  useEffect(() => {
    if (geo.loading || geoToastShown.current) return
    geoToastShown.current = true
    if (geo.error) {
      toast.warning("Brak dostępu do lokalizacji")
    } else if (geo.coords) {
      toast.success("Lokalizacja pobrana")
    }
  }, [geo.loading, geo.error, geo.coords])

  const handleViewportChange = useCallback((vp: MapViewport) => {
    setZoom(Math.round(vp.zoom))
  }, [])

  const handleFilterChange = useCallback(
    async (filters: { category_id?: string; status?: string }) => {
      setListLoading(true)
      try {
        const data = await getReportsAction(filters)
        setReports(data)
      } finally {
        setListLoading(false)
      }
    },
    []
  )

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (geo.loading) {
        toast.info("Czekam na lokalizację GPS…")
        return
      }
      if (!geo.coords) {
        toast.error("Brak lokalizacji GPS. Włącz dostęp do lokalizacji w przeglądarce.")
        return
      }
      const dist = haversineDistance(geo.coords.lat, geo.coords.lng, lat, lng)
      if (dist > REPORT_RADIUS_KM) {
        toast.error(`Zbyt daleko (${dist.toFixed(1)} km). Limit: ${REPORT_RADIUS_KM} km.`)
        return
      }
      setModalCoords({ lat, lng })
    },
    [geo.loading, geo.coords]
  )

  const mapCenter: [number, number] = geo.coords
    ? [geo.coords.lng, geo.coords.lat]
    : FALLBACK_CENTER

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Map */}
      <div className="relative flex-1">
        <ReportMap
          pinData={pinData}
          categories={categories}
          zoom={zoom}
          center={mapCenter}
          userPosition={geo.coords}
          onViewportChange={handleViewportChange}
          onMapClick={isAuthenticated ? handleMapClick : undefined}
          isAuthenticated={isAuthenticated}
        />
        {/* GPS badge */}
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs shadow backdrop-blur">
          {geo.loading ? (
            <><LocateFixed className="h-3.5 w-3.5 animate-pulse text-blue-400" /> Pobieranie lokalizacji…</>
          ) : geo.coords ? (
            <><LocateFixed className="h-3.5 w-3.5 text-blue-400" /> GPS aktywny · {REPORT_RADIUS_KM} km</>
          ) : (
            <><LocateOff className="h-3.5 w-3.5 text-muted-foreground" /> Brak lokalizacji</>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-80 shrink-0 border-l bg-background overflow-hidden">
        <ReportList
          reports={reports}
          categories={categories}
          loading={listLoading}
          onFilterChange={handleFilterChange}
        />
      </aside>

      {/* New report modal */}
      {modalCoords && (
        <NewReportModal
          open={!!modalCoords}
          onClose={() => setModalCoords(null)}
          latitude={modalCoords.lat}
          longitude={modalCoords.lng}
          categories={categories}
        />
      )}
    </div>
  )
}
