"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { apiFetch } from "./client"
import type { User } from "@/lib/types"

interface LoginResponse {
  access: string
  refresh: string
}

export async function loginAction(email: string, password: string) {
  const data = await apiFetch<LoginResponse>("/token/pair", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  })

  const isSecure = process.env.NODE_ENV === "production" && !process.env.INSECURE_COOKIES

  const cookieStore = await cookies()
  cookieStore.set("access_token", data.access, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  })
  cookieStore.set("refresh_token", data.refresh, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  // Return success — client will do full navigation
}

export async function registerAction(
  email: string,
  username: string,
  password: string
) {
  await apiFetch<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
    auth: false,
  })
  await loginAction(email, password)
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete("access_token")
  cookieStore.delete("refresh_token")
  redirect("/login")
}

export async function getMeAction(): Promise<User | null> {
  try {
    return await apiFetch<User>("/auth/me")
  } catch {
    return null
  }
}
