"use server"

import { apiFetch, apiFetchForm } from "./client"
import type { Report, HexCell, PinItem } from "@/lib/types"

interface ReportsListParams {
  category_id?: string
  status?: string
  ordering?: string
}

export async function getReportsAction(
  params: ReportsListParams = {}
): Promise<Report[]> {
  const query = new URLSearchParams()
  if (params.category_id) query.set("category_id", params.category_id)
  if (params.status) query.set("status", params.status)
  if (params.ordering) query.set("ordering", params.ordering)
  const qs = query.toString() ? `?${query.toString()}` : ""
  return apiFetch<Report[]>(`/reports/${qs}`, { auth: false })
}

export async function getReportAction(id: string): Promise<Report> {
  return apiFetch<Report>(`/reports/${id}`, { auth: false })
}

export async function createReportAction(data: {
  title: string
  description: string
  category_id: string
  latitude: number
  longitude: number
}): Promise<Report> {
  return apiFetch<Report>("/reports/", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateReportAction(
  id: string,
  data: Partial<{ title: string; description: string; status: string }>
): Promise<Report> {
  return apiFetch<Report>(`/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteReportAction(id: string): Promise<void> {
  return apiFetch<void>(`/reports/${id}`, { method: "DELETE" })
}

export async function uploadReportImageAction(
  reportId: string,
  formData: FormData
) {
  return apiFetchForm(`/reports/${reportId}/images`, formData)
}

export async function deleteReportImageAction(
  reportId: string,
  imageId: string
): Promise<void> {
  return apiFetch<void>(`/reports/${reportId}/images/${imageId}`, {
    method: "DELETE",
  })
}

export async function getMapDataAction(
  view: "hex" | "pins",
  resolution = 7
): Promise<HexCell[] | PinItem[]> {
  return apiFetch<HexCell[] | PinItem[]>(
    `/reports/map?view=${view}&resolution=${resolution}`,
    { auth: false }
  )
}
