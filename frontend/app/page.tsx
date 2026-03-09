import { getReportsAction, getMapDataAction } from "@/lib/api/reports"
import { getCategoriesAction, getCategoryGroupsAction } from "@/lib/api/categories"
import { isAuthenticated, getCurrentUser } from "@/lib/auth"
import { HomeClient } from "./HomeClient"
import type { HexCell } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [reports, hexData, categories, categoryGroups, authed, currentUser] = await Promise.all([
    getReportsAction(),
    getMapDataAction("hex", 7),
    getCategoriesAction(),
    getCategoryGroupsAction(),
    isAuthenticated(),
    getCurrentUser(),
  ])

  return (
    <HomeClient
      initialReports={reports}
      initialHexData={hexData as HexCell[]}
      categories={categories}
      categoryGroups={categoryGroups}
      isAuthenticated={authed}
      currentUser={currentUser}
    />
  )
}
