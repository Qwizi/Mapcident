export type UserRole = "user" | "admin"

export interface User {
  id: string
  email: string
  username: string
  role: UserRole
}

export type ReportStatus = "pending" | "in_review" | "resolved" | "rejected"

export interface CategoryGroup {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  order: number
  categories: Category[]
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  group_id: string | null
  order: number
}

export interface ReportImage {
  id: string
  image: string
  order: number
}

export interface Report {
  id: string
  title: string
  description: string
  category_id: string
  author_id: string
  status: ReportStatus
  latitude: number
  longitude: number
  h3_index: string
  images: ReportImage[]
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  report_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface HexCell {
  h3_index: string
  count: number
  lat: number
  lng: number
}

export interface PinItem {
  id: string
  title: string
  status: ReportStatus
  lat: number
  lng: number
  h3_index: string
  category_id: string
}

export interface PaginatedResponse<T> {
  items: T[]
  count: number
}

export interface ApiError {
  detail: string
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "Oczekujące",
  in_review: "W trakcie rozpatrywania",
  resolved: "Rozwiązane",
  rejected: "Odrzucone",
}

export const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_review: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}
