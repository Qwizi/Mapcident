"use server"

import { apiFetch } from "./client"
import type { Category, CategoryGroup } from "@/lib/types"

export async function getCategoriesAction(): Promise<Category[]> {
  return apiFetch<Category[]>("/categories/", { auth: false })
}

export async function getCategoryGroupsAction(): Promise<CategoryGroup[]> {
  return apiFetch<CategoryGroup[]>("/categories/grouped/", { auth: false })
}
