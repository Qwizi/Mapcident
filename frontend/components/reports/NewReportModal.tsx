"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema"
import { z } from "zod"
import { toast } from "sonner"
import { MapPin } from "lucide-react"
import { createReportAction } from "@/lib/api/reports"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { Category } from "@/lib/types"

const schema = z.object({
  title: z.string().min(5, "Tytuł musi mieć min. 5 znaków"),
  description: z.string().min(10, "Opis musi mieć min. 10 znaków"),
  category_id: z.string().min(1, "Wybierz kategorię"),
})
type FormData = z.infer<typeof schema>

interface NewReportModalProps {
  open: boolean
  onClose: () => void
  latitude: number
  longitude: number
  categories: Category[]
}

export function NewReportModal({
  open,
  onClose,
  latitude,
  longitude,
  categories,
}: NewReportModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", category_id: "" },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await createReportAction({ ...data, latitude, longitude })
      toast.success("Zgłoszenie zostało dodane")
      form.reset()
      onClose()
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd dodawania zgłoszenia")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nowe zgłoszenie</DialogTitle>
          <DialogDescription className="flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3" />
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tytuł</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Dziura w jezdni" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Opisz problem dokładniej…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz kategorię" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Dodawanie…" : "Dodaj zgłoszenie"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
