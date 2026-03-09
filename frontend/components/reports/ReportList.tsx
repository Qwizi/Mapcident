"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ReportCard } from "./ReportCard"
import { Skeleton } from "@/components/ui/skeleton"
import type { Report, Category } from "@/lib/types"

interface ReportListProps {
  reports: Report[]
  categories: Category[]
  loading?: boolean
  onFilterChange: (filters: { category_id?: string; status?: string }) => void
}

export function ReportList({
  reports,
  categories,
  loading,
  onFilterChange,
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

  const filtered = reports.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <h2 className="font-semibold">Zgłoszenia ({filtered.length})</h2>

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
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="flex-1 text-xs">
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie kategorie</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
        <div className="space-y-2 pr-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Brak zgłoszeń
            </p>
          ) : (
            filtered.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                category={categoryMap[r.category_id]}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
