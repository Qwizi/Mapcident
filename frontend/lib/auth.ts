import { cookies } from "next/headers"
import type { User } from "@/lib/types"

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get("access_token")?.value
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken()
  return !!token
}

export async function getCurrentUser(): Promise<User | null> {
  const token = await getAccessToken()
  if (!token) return null

  try {
    const API_URL = process.env.API_URL ?? "http://localhost:8000/api/v1"
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
