"use client"

import { useRef, useMemo, useState, useEffect, useCallback } from "react"
import {
  Map,
  MapMarker,
  MarkerContent,
  MapPopup,
  MapControls,
  useMap,
  type MapRef,
  type MapViewport,
} from "@/components/ui/map"
import type MapLibreGL from "maplibre-gl"
import type { PinItem, Report, Comment, Category, User } from "@/lib/types"
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types"
import { getReportAction } from "@/lib/api/reports"
import { getCommentsAction, createCommentAction, updateCommentAction, deleteCommentAction } from "@/lib/api/comments"
import { updateReportAction, deleteReportAction, uploadReportImageAction, deleteReportImageAction } from "@/lib/api/reports"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, Calendar, Pencil, Trash2, Loader2, X, ImagePlus, MessageSquare, ChevronDown, ChevronUp } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ImageGalleryModal } from "./ImageGalleryModal"

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL ?? "http://localhost:8000"

interface UserPosition { lat: number; lng: number }

interface PinPlacement {
  lat: number
  lng: number
}

interface ReportMapProps {
  pinData: PinItem[]
  categories: Category[]
  center: [number, number]
  zoom: number
  userPosition: UserPosition | null
  currentUser: User | null
  activeReportId: string | null
  onActiveReportChange: (id: string | null) => void
  onViewportChange?: (viewport: MapViewport) => void
  onReportDeleted?: (id: string) => void
  onMapReady?: (ref: MapRef) => void
  placingPin?: boolean
  pinPosition?: PinPlacement | null
  pinOrigin?: PinPlacement | null
  onPinPositionChange?: (pos: PinPlacement) => void
}

// Max drag radius in meters
const PIN_DRAG_RADIUS_M = 200

function haversineDistance(a: PinPlacement, b: PinPlacement): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function clampToRadius(origin: PinPlacement, target: PinPlacement, radiusM: number): PinPlacement {
  const dist = haversineDistance(origin, target)
  if (dist <= radiusM) return target
  const ratio = radiusM / dist
  return {
    lat: origin.lat + (target.lat - origin.lat) * ratio,
    lng: origin.lng + (target.lng - origin.lng) * ratio,
  }
}

// Generate a GeoJSON circle polygon (64 vertices)
function circlePolygon(center: PinPlacement, radiusM: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 64
  const coords: [number, number][] = []
  const R = 6371000
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dLat = (radiusM / R) * Math.cos(angle)
    const dLng = (radiusM / (R * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle)
    coords.push([center.lng + (dLng * 180) / Math.PI, center.lat + (dLat * 180) / Math.PI])
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} }
}

// Renders a radius circle on the map during pin placement
function PlacementRadiusCircle({ origin }: { origin: PinPlacement }) {
  const { map, isLoaded } = useMap()
  const sourceId = "placement-radius"
  const fillId = "placement-radius-fill"
  const strokeId = "placement-radius-stroke"

  useEffect(() => {
    if (!map || !isLoaded) return
    const geojson = circlePolygon(origin, PIN_DRAG_RADIUS_M)

    map.addSource(sourceId, { type: "geojson", data: geojson })
    map.addLayer({
      id: fillId,
      type: "fill",
      source: sourceId,
      paint: { "fill-color": "#3b82f6", "fill-opacity": 0.08 },
    })
    map.addLayer({
      id: strokeId,
      type: "line",
      source: sourceId,
      paint: { "line-color": "#3b82f6", "line-width": 2, "line-dasharray": [3, 2], "line-opacity": 0.5 },
    })

    return () => {
      try {
        if (map.getLayer(strokeId)) map.removeLayer(strokeId)
        if (map.getLayer(fillId)) map.removeLayer(fillId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      } catch { /* style may be gone */ }
    }
  }, [map, isLoaded, origin])

  return null
}

// ──────────────────────────────────────────────
// GeoJSON Cluster Layer for report pins (WebGL)
// ──────────────────────────────────────────────
function ReportClusterLayer({
  pinData,
  categoryMap,
  onPointClick,
}: {
  pinData: PinItem[]
  categoryMap: Record<string, Category>
  onPointClick: (id: string) => void
}) {
  const { map, isLoaded } = useMap()
  const sourceId = "report-pins"
  const clusterLayerId = "report-clusters"
  const clusterCountLayerId = "report-cluster-count"
  const pointLayerId = "report-points"
  const pointStrokeLayerId = "report-points-stroke"

  const geojson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: pinData.map((pin) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [pin.lng, pin.lat] },
        properties: {
          id: pin.id,
          title: pin.title,
          color: categoryMap[pin.category_id]?.color ?? "#6B7280",
        },
      })),
    }),
    [pinData, categoryMap]
  )

  // Store latest callback in ref to avoid re-mounting layers
  const onPointClickRef = useRef(onPointClick)
  onPointClickRef.current = onPointClick

  useEffect(() => {
    if (!map || !isLoaded) return

    map.addSource(sourceId, {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 55,
    })

    // Cluster circles
    map.addLayer({
      id: clusterLayerId,
      type: "circle",
      source: sourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step", ["get", "point_count"],
          "#6366f1", 10, "#f59e0b", 50, "#ef4444",
        ],
        "circle-radius": [
          "step", ["get", "point_count"],
          18, 10, 24, 50, 32,
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.9,
      },
    })

    // Cluster count text
    map.addLayer({
      id: clusterCountLayerId,
      type: "symbol",
      source: sourceId,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 12,
      },
      paint: { "text-color": "#fff" },
    })

    // Pin stroke (outer ring — drawn first, behind fill)
    map.addLayer({
      id: pointStrokeLayerId,
      type: "circle",
      source: sourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": "#ffffff",
        "circle-radius": 9,
      },
    })

    // Pin fill with category color
    map.addLayer({
      id: pointLayerId,
      type: "circle",
      source: sourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": 7,
      },
    })

    // ── Click handlers ──
    const handleClusterClick = async (
      e: MapLibreGL.MapMouseEvent & { features?: MapLibreGL.MapGeoJSONFeature[] }
    ) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [clusterLayerId] })
      if (!features.length) return
      const clusterId = features[0].properties?.cluster_id as number
      const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number]
      const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource
      const zoom = await source.getClusterExpansionZoom(clusterId)
      map.easeTo({ center: coords, zoom })
    }

    const handlePointClick = (
      e: MapLibreGL.MapMouseEvent & { features?: MapLibreGL.MapGeoJSONFeature[] }
    ) => {
      if (!e.features?.length) return
      const id = e.features[0].properties?.id as string
      if (id) onPointClickRef.current(id)
    }

    const setCursor = () => { map.getCanvas().style.cursor = "pointer" }
    const resetCursor = () => { map.getCanvas().style.cursor = "" }

    map.on("click", clusterLayerId, handleClusterClick)
    map.on("click", pointLayerId, handlePointClick)
    map.on("mouseenter", clusterLayerId, setCursor)
    map.on("mouseleave", clusterLayerId, resetCursor)
    map.on("mouseenter", pointLayerId, setCursor)
    map.on("mouseleave", pointLayerId, resetCursor)

    return () => {
      map.off("click", clusterLayerId, handleClusterClick)
      map.off("click", pointLayerId, handlePointClick)
      map.off("mouseenter", clusterLayerId, setCursor)
      map.off("mouseleave", clusterLayerId, resetCursor)
      map.off("mouseenter", pointLayerId, setCursor)
      map.off("mouseleave", pointLayerId, resetCursor)
      try {
        if (map.getLayer(clusterCountLayerId)) map.removeLayer(clusterCountLayerId)
        if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId)
        if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId)
        if (map.getLayer(pointStrokeLayerId)) map.removeLayer(pointStrokeLayerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded])

  // Update data when pinData or categories change
  useEffect(() => {
    if (!map || !isLoaded) return
    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource | undefined
    source?.setData(geojson)
  }, [map, isLoaded, geojson])

  return null
}

// ──────────────────────────────────────────────
// FlyTo helper
// ──────────────────────────────────────────────
function FlyToActive({ activePin }: { activePin: PinItem | null }) {
  const { map, isLoaded } = useMap()
  const prevId = useRef<string | null>(null)

  useEffect(() => {
    if (!map || !isLoaded || !activePin) return
    if (prevId.current === activePin.id) return
    prevId.current = activePin.id
    map.flyTo({ center: [activePin.lng, activePin.lat], zoom: Math.max(map.getZoom(), 15), duration: 800 })
  }, [map, isLoaded, activePin])

  return null
}

// Notify parent when map is ready
function MapReadyNotifier({ onMapReady }: { onMapReady?: (map: MapRef) => void }) {
  const { map, isLoaded } = useMap()
  const notifiedRef = useRef(false)

  useEffect(() => {
    if (!map || !isLoaded || notifiedRef.current) return
    notifiedRef.current = true
    onMapReady?.(map)
  }, [map, isLoaded, onMapReady])

  return null
}

// ──────────────────────────────────────────────
// Rich popup content
// ──────────────────────────────────────────────
function PopupContent({
  pin,
  category,
  currentUser,
  onClose,
  onDeleted,
}: {
  pin: PinItem
  category?: Category
  currentUser: User | null
  onClose: () => void
  onDeleted?: (id: string) => void
}) {
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editStatus, setEditStatus] = useState("")
  const [saving, setSaving] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [editCommentId, setEditCommentId] = useState<string | null>(null)
  const [editCommentContent, setEditCommentContent] = useState("")
  const [uploadingImages, setUploadingImages] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setEditing(false)
    setShowComments(false)
    Promise.all([
      getReportAction(pin.id).catch(() => null),
      getCommentsAction(pin.id).catch(() => [] as Comment[]),
    ]).then(([r, c]) => {
      if (cancelled) return
      setReport(r)
      setComments(c)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [pin.id])

  const canModify = report && currentUser &&
    (currentUser.id === report.author_id || currentUser.role === "admin")
  const isAdmin = currentUser?.role === "admin"

  function startEditing() {
    if (!report) return
    setEditTitle(report.title)
    setEditDescription(report.description)
    setEditStatus(report.status)
    setEditing(true)
  }

  async function handleSave() {
    if (!report) return
    setSaving(true)
    try {
      const updated = await updateReportAction(report.id, {
        title: editTitle,
        description: editDescription,
        ...(isAdmin ? { status: editStatus } : {}),
      })
      setReport(updated)
      setEditing(false)
      toast.success("Zgłoszenie zaktualizowane")
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd zapisu")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!report || !window.confirm("Czy na pewno chcesz usunąć to zgłoszenie?")) return
    try {
      await deleteReportAction(report.id)
      toast.success("Zgłoszenie usunięte")
      onClose()
      onDeleted?.(report.id)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd usuwania")
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!report || !e.target.files?.length) return
    setUploadingImages(true)
    try {
      for (const file of Array.from(e.target.files)) {
        const fd = new FormData()
        fd.append("image", file)
        await uploadReportImageAction(report.id, fd)
      }
      const updated = await getReportAction(report.id)
      setReport(updated)
      toast.success("Zdjęcia dodane")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd uploadu")
    } finally {
      setUploadingImages(false)
      e.target.value = ""
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!report) return
    try {
      await deleteReportImageAction(report.id, imageId)
      setReport((prev) => prev ? { ...prev, images: prev.images.filter((i) => i.id !== imageId) } : prev)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd usuwania zdjęcia")
    }
  }

  async function handleAddComment() {
    if (!report || !newComment.trim()) return
    setCommentSubmitting(true)
    try {
      const comment = await createCommentAction(report.id, newComment.trim())
      setComments((prev) => [...prev, comment])
      setNewComment("")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd dodawania komentarza")
    } finally {
      setCommentSubmitting(false)
    }
  }

  async function handleEditComment(commentId: string) {
    if (!report) return
    try {
      const updated = await updateCommentAction(report.id, commentId, editCommentContent)
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)))
      setEditCommentId(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd edycji")
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!report) return
    try {
      await deleteCommentAction(report.id, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd usuwania komentarza")
    }
  }

  const canModifyComment = (comment: Comment) =>
    currentUser && (currentUser.id === comment.author_id || currentUser.role === "admin")

  // Stop ALL events from reaching MapLibre (keyboard typing in textarea, etc.)
  const stopAll = {
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
    onKeyUp: (e: React.KeyboardEvent) => e.stopPropagation(),
    onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
    onWheel: (e: React.WheelEvent) => e.stopPropagation(),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 px-4" {...stopAll}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="py-4 px-2 text-center text-sm text-muted-foreground" {...stopAll}>
        Nie udało się załadować zgłoszenia.
      </div>
    )
  }

  const date = new Date(report.created_at).toLocaleDateString("pl-PL", {
    day: "numeric", month: "short", year: "numeric",
  })

  // Decide image grid layout
  const imageCount = report.images.length
  const imageGridClass =
    imageCount === 1
      ? "grid grid-cols-1"
      : imageCount === 2
      ? "grid grid-cols-2 gap-1.5"
      : "grid grid-cols-3 gap-1.5"

  return (
    <div
      className="w-[calc(100vw-3rem)] max-w-[360px] space-y-3"
      {...stopAll}
    >
      {/* Header */}
      <div className="space-y-1.5">
        {editing ? (
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm font-semibold" />
        ) : (
          <h3 className="font-semibold text-sm leading-snug pr-6">{report.title}</h3>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`text-[10px] ${STATUS_COLORS[report.status]}`}>
            {STATUS_LABELS[report.status]}
          </Badge>
          {category && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
              {category.name}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" />
            {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
          </span>
          <span suppressHydrationWarning className="flex items-center gap-0.5">
            <Calendar className="h-2.5 w-2.5" />
            {date}
          </span>
        </div>
      </div>

      <Separator />

      {/* Description */}
      {editing ? (
        <div className="space-y-2">
          <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="text-xs" />
          {isAdmin && (
            <Select value={editStatus} onValueChange={(v) => setEditStatus(v ?? "")}>
              <SelectTrigger className="text-xs h-7">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Oczekujące</SelectItem>
                <SelectItem value="in_review">W trakcie</SelectItem>
                <SelectItem value="resolved">Rozwiązane</SelectItem>
                <SelectItem value="rejected">Odrzucone</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-1.5">
            <Button size="sm" className="h-6 text-xs px-2" onClick={handleSave} disabled={saving}>
              {saving ? "..." : "Zapisz"}
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setEditing(false)}>
              Anuluj
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs leading-relaxed whitespace-pre-wrap line-clamp-4">{report.description}</p>
      )}

      {/* Images – grid layout, click to open gallery */}
      {imageCount > 0 && (
        <>
          <div className={imageGridClass}>
            {report.images.slice(0, 3).map((img, idx) => (
              <div key={img.id} className="relative group">
                <button
                  type="button"
                  onClick={() => { setGalleryIndex(idx); setGalleryOpen(true) }}
                  className={`relative w-full overflow-hidden rounded-lg bg-muted cursor-pointer hover:brightness-110 transition-all ${
                    imageCount === 1 ? "h-40" : "h-24"
                  }`}
                >
                  <Image src={`${MEDIA_URL}${img.image}`} alt="" fill className="object-cover" sizes="360px" />
                  {/* "+N" overlay on third image when more exist */}
                  {idx === 2 && imageCount > 3 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">+{imageCount - 3}</span>
                    </div>
                  )}
                </button>
                {canModify && (
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <ImageGalleryModal
            images={report.images}
            initialIndex={galleryIndex}
            open={galleryOpen}
            onClose={() => setGalleryOpen(false)}
          />
        </>
      )}

      {/* Actions */}
      {canModify && !editing && (
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={startEditing}>
            <Pencil className="h-2.5 w-2.5" /> Edytuj
          </Button>
          <label className="inline-flex items-center gap-1 h-6 px-2 text-[10px] border rounded cursor-pointer hover:bg-muted transition-colors">
            <ImagePlus className="h-2.5 w-2.5" />
            {uploadingImages ? "..." : "Zdjęcie"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploadingImages} />
          </label>
          <Button variant="destructive" size="sm" className="h-6 text-[10px] px-2 gap-1 ml-auto" onClick={handleDelete}>
            <Trash2 className="h-2.5 w-2.5" /> Usuń
          </Button>
        </div>
      )}

      <Separator />

      {/* Comments toggle */}
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full"
        onClick={() => setShowComments((v) => !v)}
      >
        <MessageSquare className="h-3 w-3" />
        Komentarze ({comments.length})
        {showComments ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>

      {showComments && (
        <div className="space-y-2.5">
          {/* Comments list — capped height with its own scroll */}
          <div className={comments.length > 3 ? "max-h-40 overflow-y-auto pr-1 space-y-2.5" : "space-y-2.5"}>
            {comments.length === 0 && (
              <p className="text-[10px] text-muted-foreground">Brak komentarzy.</p>
            )}
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarFallback className="text-[8px]">U</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString("pl-PL")}
                    </span>
                    {canModifyComment(comment) && (
                      <div className="flex gap-0.5">
                        <button type="button" className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => { setEditCommentId(comment.id); setEditCommentContent(comment.content) }}>
                          <Pencil className="h-2.5 w-2.5" />
                        </button>
                        <button type="button" className="h-4 w-4 flex items-center justify-center text-destructive" onClick={() => handleDeleteComment(comment.id)}>
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {editCommentId === comment.id ? (
                    <div className="space-y-1">
                      <Textarea value={editCommentContent} onChange={(e) => setEditCommentContent(e.target.value)} rows={2} className="text-[10px]" />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-5 text-[10px] px-1.5" onClick={() => handleEditComment(comment.id)}>Zapisz</Button>
                        <Button size="sm" variant="outline" className="h-5 text-[10px] px-1.5" onClick={() => setEditCommentId(null)}>Anuluj</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] leading-relaxed">{comment.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add comment form */}
          {currentUser ? (
            <div className="space-y-1.5 border-t pt-2">
              <Textarea
                placeholder="Dodaj komentarz…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="text-xs"
              />
              <Button
                size="sm"
                className="h-6 text-xs w-full"
                onClick={handleAddComment}
                disabled={commentSubmitting || !newComment.trim()}
              >
                {commentSubmitting ? "..." : "Dodaj komentarz"}
              </Button>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">Zaloguj się, aby komentować.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Main map component
// ──────────────────────────────────────────────
export function ReportMap({
  pinData, categories, center, zoom, userPosition,
  currentUser, activeReportId, onActiveReportChange,
  onViewportChange, onReportDeleted, onMapReady,
  placingPin, pinPosition, pinOrigin, onPinPositionChange,
}: ReportMapProps) {
  const mapRef = useRef<MapRef>(null)
  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  )

  const activePin = useMemo(
    () => (activeReportId ? pinData.find((p) => p.id === activeReportId) ?? null : null),
    [activeReportId, pinData]
  )

  const handlePointClick = useCallback(
    (id: string) => onActiveReportChange(id),
    [onActiveReportChange]
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
      <FlyToActive activePin={activePin} />
      <MapReadyNotifier onMapReady={onMapReady} />

      {/* GPS user marker (DOM — just one element, fine) */}
      {userPosition && (
        <MapMarker longitude={userPosition.lng} latitude={userPosition.lat}>
          <MarkerContent>
            <div className="relative flex items-center justify-center">
              <span className="absolute h-6 w-6 rounded-full bg-blue-400/40 animate-ping" />
              <span className="relative h-3.5 w-3.5 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      {/* Radius circle for pin placement */}
      {placingPin && pinOrigin && <PlacementRadiusCircle origin={pinOrigin} />}

      {/* Draggable pin for new report placement */}
      {placingPin && pinPosition && (
        <MapMarker
          longitude={pinPosition.lng}
          latitude={pinPosition.lat}
          draggable
          onDrag={(lngLat) => {
            if (pinOrigin) {
              const clamped = clampToRadius(pinOrigin, { lat: lngLat.lat, lng: lngLat.lng }, PIN_DRAG_RADIUS_M)
              onPinPositionChange?.(clamped)
            } else {
              onPinPositionChange?.({ lat: lngLat.lat, lng: lngLat.lng })
            }
          }}
          onDragEnd={(lngLat) => {
            if (pinOrigin) {
              const clamped = clampToRadius(pinOrigin, { lat: lngLat.lat, lng: lngLat.lng }, PIN_DRAG_RADIUS_M)
              onPinPositionChange?.(clamped)
            } else {
              onPinPositionChange?.({ lat: lngLat.lat, lng: lngLat.lng })
            }
          }}
        >
          <MarkerContent className="cursor-grab active:cursor-grabbing">
            <div className="relative flex flex-col items-center">
              <div className="relative">
                <MapPin className="h-10 w-10 text-red-500 drop-shadow-lg" fill="currentColor" strokeWidth={1.5} stroke="white" />
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white border-2 border-red-500 animate-pulse" />
              </div>
              <span className="mt-0.5 text-[10px] font-medium text-white bg-black/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                Przeciągnij mnie
              </span>
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      {/* Report pins as WebGL cluster layer */}
      <ReportClusterLayer
        pinData={pinData}
        categoryMap={categoryMap}
        onPointClick={handlePointClick}
      />

      {/* Rich popup for active report */}
      {activePin && (
        <MapPopup
          longitude={activePin.lng}
          latitude={activePin.lat}
          onClose={() => onActiveReportChange(null)}
          closeButton
          closeOnClick={false}
          offset={[0, -12] as [number, number]}
        >
          <PopupContent
            pin={activePin}
            category={categoryMap[activePin.category_id]}
            currentUser={currentUser}
            onClose={() => onActiveReportChange(null)}
            onDeleted={onReportDeleted}
          />
        </MapPopup>
      )}
    </Map>
  )
}
