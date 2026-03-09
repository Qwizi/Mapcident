"use client"

import dynamic from "next/dynamic"
import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { LocateFixed, LocateOff, Plus, List, Check, X as XIcon } from "lucide-react"
import { getMapDataAction, getReportsAction } from "@/lib/api/reports"
import { ReportList } from "@/components/reports/ReportList"
import { NewReportModal } from "@/components/reports/NewReportModal"
import { useGeolocation } from "@/hooks/useGeolocation"
import type { PinItem, Report, Category, CategoryGroup, HexCell, User } from "@/lib/types"
import type { MapViewport } from "@/components/ui/map"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type MapLibreGL from "maplibre-gl"

const ReportMap = dynamic(
  () => import("@/components/map/ReportMap").then((m) => m.ReportMap),
  { ssr: false }
)

const FALLBACK_CENTER: [number, number] = [21.012, 52.229]

interface HomeClientProps {
  initialReports: Report[]
  initialHexData: HexCell[]
  categories: Category[]
  categoryGroups: CategoryGroup[]
  isAuthenticated: boolean
  currentUser: User | null
}

export function HomeClient({
  initialReports,
  initialHexData,
  categories,
  categoryGroups,
  isAuthenticated,
  currentUser,
}: HomeClientProps) {
  const [reports, setReports] = useState(initialReports)
  const [pinData, setPinData] = useState<PinItem[]>([])
  const [zoom, setZoom] = useState(12)
  const [newReportOpen, setNewReportOpen] = useState(false)
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [placingPin, setPlacingPin] = useState(false)
  const [pinPosition, setPinPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [pinOrigin, setPinOrigin] = useState<{ lat: number; lng: number } | null>(null)

  const geo = useGeolocation()
  const geoToastShown = useRef(false)
  const mapInstanceRef = useRef<MapLibreGL.Map | null>(null)
  const hasFlownToGps = useRef(false)

  // Suppress unused var
  void initialHexData

  useEffect(() => {
    getMapDataAction("pins")
      .then((pins) => setPinData(pins as PinItem[]))
      .catch(() => toast.error("Błąd ładowania pinów"))
  }, [])

  // GPS toast
  useEffect(() => {
    if (geo.loading || geoToastShown.current) return
    geoToastShown.current = true
    if (geo.coords) {
      toast.success("Lokalizacja pobrana")
    }
  }, [geo.loading, geo.coords])

  // Fly to GPS when coordinates become available
  useEffect(() => {
    if (!geo.coords || hasFlownToGps.current || !mapInstanceRef.current) return
    hasFlownToGps.current = true
    mapInstanceRef.current.flyTo({
      center: [geo.coords.lng, geo.coords.lat],
      zoom: 14,
      duration: 1200,
    })
  }, [geo.coords])

  const handleMapReady = useCallback((map: MapLibreGL.Map) => {
    mapInstanceRef.current = map
    // If GPS already available when map loads, fly to it
    if (geo.coords && !hasFlownToGps.current) {
      hasFlownToGps.current = true
      map.flyTo({
        center: [geo.coords.lng, geo.coords.lat],
        zoom: 14,
        duration: 1200,
      })
    }
  }, [geo.coords])

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

  const handleNewReport = useCallback(() => {
    if (!isAuthenticated) {
      toast.error("Zaloguj się, aby dodać zgłoszenie")
      return
    }
    // Enter pin placement mode
    const startPos = geo.coords
      ? { lat: geo.coords.lat, lng: geo.coords.lng }
      : { lat: FALLBACK_CENTER[1], lng: FALLBACK_CENTER[0] }

    setPinPosition(startPos)
    setPinOrigin(startPos)

    // Fly to GPS first, then enable placement
    if (geo.coords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [startPos.lng, startPos.lat],
        zoom: Math.max(mapInstanceRef.current.getZoom(), 17),
        duration: 800,
      })
      setTimeout(() => setPlacingPin(true), 850)
    } else {
      if (!geo.coords && !geo.loading) {
        toast.warning("Brak GPS — ustaw lokalizację ręcznie na mapie")
      }
      setPlacingPin(true)
    }
  }, [isAuthenticated, geo.coords, geo.loading])

  const handlePinConfirm = useCallback(() => {
    setPlacingPin(false)
    setNewReportOpen(true)
  }, [])

  const handlePinCancel = useCallback(() => {
    setPlacingPin(false)
    setPinPosition(null)
    setPinOrigin(null)
  }, [])

  const handleReportDeleted = useCallback((id: string) => {
    setPinData((prev) => prev.filter((p) => p.id !== id))
    setReports((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const handleReportCreated = useCallback((report: Report) => {
    const newPin: PinItem = {
      id: report.id,
      title: report.title,
      status: report.status,
      lat: report.latitude,
      lng: report.longitude,
      h3_index: report.h3_index,
      category_id: report.category_id,
    }
    setPinData((prev) => [...prev, newPin])
    setReports((prev) => [report, ...prev])
    setActiveReportId(report.id)
  }, [])

  const handleReportSelect = useCallback((report: Report) => {
    setActiveReportId(report.id)
    setMobileSheetOpen(false)
  }, [])

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
          currentUser={currentUser}
          activeReportId={placingPin ? null : activeReportId}
          onActiveReportChange={setActiveReportId}
          onViewportChange={handleViewportChange}
          onReportDeleted={handleReportDeleted}
          onMapReady={handleMapReady}
          placingPin={placingPin}
          pinPosition={pinPosition}
          pinOrigin={pinOrigin}
          onPinPositionChange={setPinPosition}
        />

        {/* Pin placement mode overlay */}
        {placingPin && (
          <div className="absolute inset-x-0 top-0 z-20 flex flex-col items-center pointer-events-none">
            <div className="pointer-events-auto mt-3 mx-3 flex items-center gap-3 rounded-2xl bg-background/95 px-4 py-3 shadow-xl backdrop-blur border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Ustaw lokalizację zgłoszenia</p>
                <p className="text-xs text-muted-foreground">Przeciągnij pinezkę w odpowiednie miejsce</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-full"
                  onClick={handlePinCancel}
                >
                  <XIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Anuluj</span>
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 rounded-full"
                  onClick={handlePinConfirm}
                >
                  <Check className="h-4 w-4" />
                  <span className="hidden sm:inline">Potwierdź</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* GPS badge */}
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs shadow backdrop-blur">
          {geo.loading ? (
            <><LocateFixed className="h-3.5 w-3.5 animate-pulse text-blue-400" /> <span className="hidden sm:inline">Lokalizacja…</span></>
          ) : geo.coords ? (
            <><LocateFixed className="h-3.5 w-3.5 text-blue-400" /> <span className="hidden sm:inline">GPS aktywny</span></>
          ) : (
            <><LocateOff className="h-3.5 w-3.5 text-muted-foreground" /> <span className="hidden sm:inline">Brak GPS</span></>
          )}
        </div>

        {/* Mobile reports toggle */}
        {!placingPin && (
          <div className="md:hidden absolute top-3 left-3 z-10">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full shadow-lg gap-1.5 px-4"
              onClick={() => setMobileSheetOpen(true)}
            >
              <List className="h-4 w-4" />
              Zgłoszenia ({reports.length})
            </Button>
          </div>
        )}

        {/* FAB - New report button */}
        {isAuthenticated && !placingPin && (
          <div className="absolute bottom-4 right-4 z-10">
            <Button
              size="lg"
              className="rounded-full h-14 w-14 shadow-lg"
              onClick={handleNewReport}
              aria-label="Nowe zgłoszenie"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-80 shrink-0 border-l bg-background overflow-hidden">
        <ReportList
          reports={reports}
          categories={categories}
          categoryGroups={categoryGroups}
          loading={listLoading}
          onFilterChange={handleFilterChange}
          onReportSelect={handleReportSelect}
          userPosition={geo.coords}
        />
      </aside>

      {/* Mobile Sheet */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="bottom" className="md:hidden max-h-[75vh] rounded-t-2xl p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
            <SheetTitle>Zgłoszenia</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <ReportList
              reports={reports}
              categories={categories}
              categoryGroups={categoryGroups}
              loading={listLoading}
              onFilterChange={handleFilterChange}
              onReportSelect={handleReportSelect}
              userPosition={geo.coords}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* New report modal */}
      {newReportOpen && pinPosition && (
        <NewReportModal
          open={newReportOpen}
          onClose={() => {
            setNewReportOpen(false)
            setPinPosition(null)
            setPinOrigin(null)
          }}
          latitude={pinPosition.lat}
          longitude={pinPosition.lng}
          categories={categories}
          categoryGroups={categoryGroups}
          onReportCreated={handleReportCreated}
        />
      )}
    </div>
  )
}
