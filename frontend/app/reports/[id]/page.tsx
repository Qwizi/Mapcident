import { notFound } from "next/navigation"
import dynamic from "next/dynamic"
import { getReportAction } from "@/lib/api/reports"
import { getCommentsAction } from "@/lib/api/comments"
import { getCategoriesAction } from "@/lib/api/categories"
import { getCurrentUser } from "@/lib/auth"
import { CommentList } from "@/components/comments/CommentList"
import { ReportStatusBadge } from "@/components/reports/ReportStatusBadge"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, User } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Image from "next/image"

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [report, comments, categories, currentUser] = await Promise.all([
    getReportAction(id).catch(() => null),
    getCommentsAction(id).catch(() => []),
    getCategoriesAction(),
    getCurrentUser(),
  ])

  if (!report) notFound()

  const category = categories.find((c) => c.id === report.category_id)
  const date = new Date(report.created_at).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{report.title}</h1>
          <ReportStatusBadge status={report.status} />
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {category && (
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {date}
          </span>
        </div>
      </div>

      <Separator />

      {/* Description */}
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{report.description}</p>

      {/* Images */}
      {report.images.length > 0 && (
        <Carousel className="w-full">
          <CarouselContent>
            {report.images.map((img) => (
              <CarouselItem key={img.id}>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_MEDIA_URL ?? "http://localhost:8000"}${img.image}`}
                    alt="Zdjęcie zgłoszenia"
                    fill
                    className="object-cover"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {report.images.length > 1 && (
            <>
              <CarouselPrevious />
              <CarouselNext />
            </>
          )}
        </Carousel>
      )}

      <Separator />

      {/* Comments */}
      <CommentList
        reportId={report.id}
        initialComments={comments}
        currentUser={currentUser}
      />
    </div>
  )
}
