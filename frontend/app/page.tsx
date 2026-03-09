import { getReportsAction, getMapDataAction } from "@/lib/api/reports"
import { getCategoriesAction } from "@/lib/api/categories"
import { isAuthenticated } from "@/lib/auth"
import { HomeClient } from "./HomeClient"
import type { HexCell } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [reports, hexData, categories, authed] = await Promise.all([
    getReportsAction(),
    getMapDataAction("hex", 7),
    getCategoriesAction(),
    isAuthenticated(),
  ])

  return (
    <HomeClient
      initialReports={reports}
      initialHexData={hexData as HexCell[]}
      categories={categories}
      isAuthenticated={authed}
    />
  )
}
