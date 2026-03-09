import { Badge } from "@/components/ui/badge"
import type { ReportStatus } from "@/lib/types"
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types"

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <Badge className={STATUS_COLORS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
