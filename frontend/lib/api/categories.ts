"use server"

import { apiFetch } from "./client"
import type { Category } from "@/lib/types"

export async function getCategoriesAction(): Promise<Category[]> {
  return apiFetch<Category[]>("/categories/", { auth: false })
}
