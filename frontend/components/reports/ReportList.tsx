"use client"

import { useState, useMemo } from "react"
import { Search, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CategoryCombobox } from "@/components/ui/category-combobox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { ReportStatusBadge } from "./ReportStatusBadge"
import type { Report, Category, CategoryGroup } from "@/lib/types"

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

interface ReportListProps {
  reports: Report[]
  categories: Category[]
  categoryGroups?: CategoryGroup[]
  loading?: boolean
  onFilterChange: (filters: { category_id?: string; status?: string }) => void
  onReportSelect?: (report: Report) => void
  userPosition?: { lat: number; lng: number } | null
}

export function ReportList({
  reports,
  categories,
  categoryGroups,
  loading,
  onFilterChange,
  onReportSelect,
  userPosition,
}: ReportListProps) {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  function handleCategoryChange(value: string | null) {
    const v = value ?? "all"
    setSelectedCategory(v)
    onFilterChange({
      category_id: v === "all" ? undefined : v,
      status: selectedStatus === "all" ? undefined : selectedStatus,
    })
  }

  function handleStatusChange(value: string | null) {
    const v = value ?? "all"
    setSelectedStatus(v)
    onFilterChange({
      category_id: selectedCategory === "all" ? undefined : selectedCategory,
      status: v === "all" ? undefined : v,
    })
  }

  const sortedReports = useMemo(() => {
    let filtered = reports.filter((r) =>
      r.title.toLowerCase().includes(search.toLowerCase())
    )

    if (userPosition) {
      filtered = filtered
        .map((r) => ({
          ...r,
          _distance: haversineDistance(
            userPosition.lat, userPosition.lng,
            r.latitude, r.longitude
          ),
        }))
        .sort((a, b) => a._distance - b._distance)
    }

    return filtered
  }, [reports, search, userPosition])

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <h2 className="font-semibold text-base">
        Zgłoszenia <span className="text-muted-foreground font-normal text-sm">({sortedReports.length})</span>
      </h2>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj zgłoszeń…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <CategoryCombobox
          value={selectedCategory}
          onChange={handleCategoryChange}
          categoryGroups={categoryGroups}
          categories={categories}
          showAll
          className="flex-1 text-xs"
        />

        <Select value={selectedStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="flex-1 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie statusy</SelectItem>
            <SelectItem value="pending">Oczekujące</SelectItem>
            <SelectItem value="in_review">W trakcie</SelectItem>
            <SelectItem value="resolved">Rozwiązane</SelectItem>
            <SelectItem value="rejected">Odrzucone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))
          ) : sortedReports.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Brak zgłoszeń
            </p>
          ) : (
            sortedReports.map((r) => {
              const cat = categoryMap[r.category_id]
              const distance = userPosition
                ? haversineDistance(userPosition.lat, userPosition.lng, r.latitude, r.longitude)
                : null
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onReportSelect?.(r)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors group flex items-start gap-3"
                >
                  {/* Pin icon */}
                  <div className="shrink-0 mt-0.5">
                    <svg width="20" height="26" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 21 13 21S26 22.75 26 13C26 5.82 20.18 0 13 0z"
                        fill={cat?.color ?? "#6B7280"}
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-muted-foreground/30"
                      />
                      <circle cx="13" cy="13" r="4.5" fill="white" fillOpacity="0.88" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h5 className="font-medium text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {r.title}
                    </h5>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <ReportStatusBadge status={r.status} />
                      {cat && (
                        <span className="text-[10px] text-muted-foreground">{cat.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {distance !== null && (
                        <span className="flex items-center gap-0.5 font-medium text-blue-400">
                          <MapPin className="h-2.5 w-2.5" />
                          {formatDistance(distance)}
                        </span>
                      )}
                      <span suppressHydrationWarning>
                        {new Date(r.created_at).toLocaleDateString("pl-PL", {
                          day: "numeric", month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
