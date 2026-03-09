import { MapPin, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReportStatusBadge } from "./ReportStatusBadge"
import type { Report, Category } from "@/lib/types"

interface ReportCardProps {
  report: Report
  category?: Category
  onClick?: () => void
}

export function ReportCard({ report, category, onClick }: ReportCardProps) {
  const date = new Date(report.created_at).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return (
    <div onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onClick?.() }}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-medium line-clamp-2">
              {report.title}
            </CardTitle>
            <ReportStatusBadge status={report.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {category && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
          </div>
          <div suppressHydrationWarning className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {date}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
