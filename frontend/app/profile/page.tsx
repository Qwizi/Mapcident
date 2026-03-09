import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { getReportsAction } from "@/lib/api/reports"
import { ReportCard } from "@/components/reports/ReportCard"
import { getCategoriesAction } from "@/lib/api/categories"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const [allReports, categories] = await Promise.all([
    getReportsAction(),
    getCategoriesAction(),
  ])

  const myReports = allReports.filter((r) => r.author_id === user.id)
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  return (
    <div className="container mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl">
            {user.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {user.role === "admin" && (
            <Badge className="mt-1" variant="secondary">
              Administrator
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Reports */}
      <div className="space-y-4">
        <h2 className="font-semibold">
          Moje zgłoszenia ({myReports.length})
        </h2>
        {myReports.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nie masz jeszcze żadnych zgłoszeń.
            </p>
            <Link href="/" className="mt-2 text-sm text-primary underline">
              Dodaj pierwsze zgłoszenie
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {myReports.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                category={categoryMap[r.category_id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
