import { cookies } from "next/headers"

const API_URL = process.env.API_URL ?? "http://localhost:8000/api/v1"

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get("access_token")?.value
}

interface FetchOptions extends RequestInit {
  auth?: boolean
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { auth = true, ...fetchOptions } = options
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (auth) {
    const token = await getAccessToken()
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
    cache: "no-store",
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? "Błąd serwera")
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export async function apiFetchForm<T>(
  path: string,
  formData: FormData,
  options: FetchOptions = {}
): Promise<T> {
  const { auth = true } = options
  const headers: Record<string, string> = {}

  if (auth) {
    const token = await getAccessToken()
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    body: formData,
    headers,
    cache: "no-store",
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? "Błąd serwera")
  }

  return res.json()
}
