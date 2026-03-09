"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Category, CategoryGroup } from "@/lib/types"

interface FlatItem {
  id: string
  name: string
  color: string
  groupName?: string
  groupIcon?: string
}

interface CategoryComboboxProps {
  value: string
  onChange: (value: string) => void
  categoryGroups?: CategoryGroup[]
  categories?: Category[]
  placeholder?: string
  showAll?: boolean
  className?: string
}

export function CategoryCombobox({
  value,
  onChange,
  categoryGroups = [],
  categories = [],
  placeholder = "Wybierz kategorię…",
  showAll = false,
  className,
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const items: FlatItem[] = React.useMemo(() => {
    const result: FlatItem[] = []
    if (showAll) {
      result.push({ id: "all", name: "Wszystkie kategorie", color: "#6B7280" })
    }
    if (categoryGroups.length > 0) {
      for (const g of categoryGroups) {
        for (const c of g.categories) {
          result.push({ id: c.id, name: c.name, color: c.color, groupName: g.name, groupIcon: g.icon })
        }
      }
    } else {
      for (const c of categories) {
        result.push({ id: c.id, name: c.name, color: c.color })
      }
    }
    return result
  }, [categoryGroups, categories, showAll])

  const selectedItem = items.find((i) => i.id === value)

  const filtered = React.useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.groupName?.toLowerCase().includes(q)
    )
  }, [items, search])

  // Group filtered items
  const groups = React.useMemo(() => {
    const map = new Map<string, FlatItem[]>()
    for (const item of filtered) {
      const key = item.groupName ?? "__root__"
      const arr = map.get(key) ?? []
      arr.push(item)
      map.set(key, arr)
    }
    return map
  }, [filtered])

  // Close on click outside
  React.useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  // Focus input when opened
  React.useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function handleSelect(id: string) {
    onChange(id)
    setOpen(false)
    setSearch("")
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background",
          "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !selectedItem && !showAll && "text-muted-foreground"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedItem && selectedItem.id !== "all" && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedItem.color }}
            />
          )}
          <span className="truncate">
            {selectedItem ? selectedItem.name : placeholder}
          </span>
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[240px] rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
          {/* Search input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj kategorii…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false)
                  setSearch("")
                }
              }}
            />
          </div>

          {/* Items */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nie znaleziono kategorii.
              </p>
            ) : (
              [...groups.entries()].map(([groupKey, groupItems]) => (
                <div key={groupKey}>
                  {groupKey !== "__root__" && (
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      {groupItems[0]?.groupIcon && <span>{groupItems[0].groupIcon}</span>}
                      {groupKey}
                    </div>
                  )}
                  {groupItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={cn(
                        "relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground",
                        value === item.id && "bg-accent/50"
                      )}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === item.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {item.id !== "all" && (
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      {item.name}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
