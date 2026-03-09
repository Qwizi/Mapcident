"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema"
import { z } from "zod"
import { toast } from "sonner"
import { MapPin, ImagePlus, X } from "lucide-react"
import { createReportAction, uploadReportImageAction } from "@/lib/api/reports"
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
import { CategoryCombobox } from "@/components/ui/category-combobox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { Category, CategoryGroup, Report } from "@/lib/types"

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
  categoryGroups: CategoryGroup[]
  onReportCreated?: (report: Report) => void
}

export function NewReportModal({
  open,
  onClose,
  latitude,
  longitude,
  categories,
  categoryGroups,
  onReportCreated,
}: NewReportModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", category_id: "" },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setImages((prev) => [...prev, ...files])
    e.target.value = ""
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const report = await createReportAction({ ...data, latitude, longitude })
      // Upload images if any
      for (const file of images) {
        const fd = new FormData()
        fd.append("image", file)
        await uploadReportImageAction(report.id, fd)
      }
      toast.success("Zgłoszenie zostało dodane")
      onReportCreated?.(report)
      form.reset()
      setImages([])
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
                  <FormControl>
                    <CategoryCombobox
                      value={field.value}
                      onChange={field.onChange}
                      categoryGroups={categoryGroups}
                      categories={categories}
                      placeholder="Wybierz kategorię"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image upload */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Zdjęcia (opcjonalnie)</p>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((file, i) => (
                    <div key={i} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-16 w-16 rounded object-cover border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-3.5 w-3.5" /> Dodaj zdjęcia
              </Button>
            </div>

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
