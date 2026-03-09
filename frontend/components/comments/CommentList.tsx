"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2, Pencil } from "lucide-react"
import { createCommentAction, deleteCommentAction, updateCommentAction } from "@/lib/api/comments"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import type { Comment, User } from "@/lib/types"

interface CommentListProps {
  reportId: string
  initialComments: Comment[]
  currentUser: User | null
}

export function CommentList({ reportId, initialComments, currentUser }: CommentListProps) {
  const router = useRouter()
  const [comments, setComments] = useState(initialComments)
  const [newContent, setNewContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")

  async function handleSubmit() {
    if (!newContent.trim()) return
    setSubmitting(true)
    try {
      const comment = await createCommentAction(reportId, newContent.trim())
      setComments((prev) => [...prev, comment])
      setNewContent("")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd dodawania komentarza")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await deleteCommentAction(reportId, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      toast.success("Komentarz usunięty")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd usuwania komentarza")
    }
  }

  async function handleEdit(commentId: string) {
    try {
      const updated = await updateCommentAction(reportId, commentId, editContent)
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)))
      setEditId(null)
      toast.success("Komentarz zaktualizowany")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd edycji komentarza")
    }
  }

  const canModify = (comment: Comment) =>
    currentUser && (currentUser.id === comment.author_id || currentUser.role === "admin")

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Komentarze ({comments.length})</h3>
      <Separator />

      <div className="space-y-4">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">Brak komentarzy. Bądź pierwszy!</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs">U</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleDateString("pl-PL")}
                </span>
                {canModify(comment) && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => { setEditId(comment.id); setEditContent(comment.content) }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {editId === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEdit(comment.id)}>Zapisz</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Anuluj</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm">{comment.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {currentUser ? (
        <div className="space-y-2 pt-2">
          <Textarea
            placeholder="Dodaj komentarz…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
          />
          <Button onClick={handleSubmit} disabled={submitting || !newContent.trim()}>
            {submitting ? "Dodawanie…" : "Dodaj komentarz"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Zaloguj się, aby dodać komentarz.
        </p>
      )}
    </div>
  )
}
