"use server"

import { apiFetch } from "./client"
import type { Comment } from "@/lib/types"

export async function getCommentsAction(reportId: string): Promise<Comment[]> {
  return apiFetch<Comment[]>(`/reports/${reportId}/comments/`, { auth: false })
}

export async function createCommentAction(
  reportId: string,
  content: string
): Promise<Comment> {
  return apiFetch<Comment>(`/reports/${reportId}/comments/`, {
    method: "POST",
    body: JSON.stringify({ content }),
  })
}

export async function updateCommentAction(
  reportId: string,
  commentId: string,
  content: string
): Promise<Comment> {
  return apiFetch<Comment>(`/reports/${reportId}/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  })
}

export async function deleteCommentAction(
  reportId: string,
  commentId: string
): Promise<void> {
  return apiFetch<void>(`/reports/${reportId}/comments/${commentId}`, {
    method: "DELETE",
  })
}
