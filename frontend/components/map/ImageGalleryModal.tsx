"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import Image from "next/image"

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL ?? "http://localhost:8000"

interface ImageGalleryModalProps {
  images: { id: string; image: string }[]
  initialIndex?: number
  open: boolean
  onClose: () => void
}

export function ImageGalleryModal({
  images,
  initialIndex = 0,
  open,
  onClose,
}: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    if (open) setCurrentIndex(initialIndex)
  }, [open, initialIndex])

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext()
      else if (e.key === "ArrowLeft") goPrev()
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, goNext, goPrev, onClose])

  if (images.length === 0) return null

  const currentImage = images[currentIndex]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden"
      >
        <DialogTitle className="sr-only">Przeglądanie zdjęć</DialogTitle>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-3 right-3 z-20 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Image */}
        <div className="relative flex items-center justify-center w-full h-[70vh] sm:h-[80vh]">
          <Image
            src={`${MEDIA_URL}${currentImage.image}`}
            alt={`Zdjęcie ${currentIndex + 1} z ${images.length}`}
            fill
            className="object-contain"
            sizes="95vw"
            priority
          />
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20 h-10 w-10"
              onClick={goPrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20 h-10 w-10"
              onClick={goNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Counter + thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-center gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded overflow-hidden border-2 transition-all ${
                    i === currentIndex
                      ? "border-white scale-110"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={`${MEDIA_URL}${img.image}`}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-white/80 text-xs mt-2">
              {currentIndex + 1} / {images.length}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
