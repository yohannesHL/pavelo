"use client";

/**
 * Step 3: Photo Upload (S8-03)
 * Drag & drop, multi-file, preview grid
 */

import { useCallback, useRef, useState } from "react";
import type { SellerFormData } from "@/app/sell/page";

interface Props {
  formData: SellerFormData;
  onUpdate: (updates: Partial<SellerFormData>) => void;
}

const MAX_FILES = 20;
const MAX_SIZE_MB = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function SellerStepPhotos({ formData, onUpdate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles: File[] = [];
      const validUrls: string[] = [];

      const fileArray = Array.from(files);
      const remaining = MAX_FILES - formData.photos.length;

      for (const file of fileArray.slice(0, remaining)) {
        if (!ACCEPTED_TYPES.includes(file.type)) continue;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) continue;
        validFiles.push(file);
        validUrls.push(URL.createObjectURL(file));
      }

      onUpdate({
        photos: [...formData.photos, ...validFiles],
        photoPreviewUrls: [...formData.photoPreviewUrls, ...validUrls],
      });
    },
    [formData.photos, formData.photoPreviewUrls, onUpdate]
  );

  const removePhoto = useCallback(
    (index: number) => {
      URL.revokeObjectURL(formData.photoPreviewUrls[index]);
      onUpdate({
        photos: formData.photos.filter((_, i) => i !== index),
        photoPreviewUrls: formData.photoPreviewUrls.filter((_, i) => i !== index),
      });
    },
    [formData.photos, formData.photoPreviewUrls, onUpdate]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-6 shadow-sm">
      <h2 className="font-[var(--font-heading)] text-xl font-bold text-[var(--foreground)]">
        Property Photos
      </h2>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Add up to {MAX_FILES} photos. Good photos increase buyer interest by up to 60%.
      </p>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`mt-6 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed transition-all ${
          isDragging
            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
            : "border-[var(--border)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--muted)]"
        }`}
        role="button"
        tabIndex={0}
        aria-label="Upload photos"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <span className="text-3xl">📸</span>
        <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
          {isDragging ? "Drop photos here" : "Drag & drop photos here"}
        </p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          or click to browse · JPEG, PNG, WebP · Max {MAX_SIZE_MB}MB each
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Photo Grid */}
      {formData.photoPreviewUrls.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">
            {formData.photos.length} photo{formData.photos.length !== 1 ? "s" : ""} added
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {formData.photoPreviewUrls.map((url, idx) => (
              <div
                key={idx}
                className="group relative aspect-square overflow-hidden rounded-[var(--radius-input)]"
              >
                <img
                  src={url}
                  alt={`Property photo ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                {/* Cover badge for first image */}
                {idx === 0 && (
                  <span className="absolute left-1 top-1 rounded-[var(--radius-badge)] bg-[var(--color-gold)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
                    COVER
                  </span>
                )}
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(idx);
                  }}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label={`Remove photo ${idx + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-4 rounded-[var(--radius-input)] bg-[var(--color-primary)]/5 p-3">
        <p className="text-xs font-medium text-[var(--color-primary)]">📷 Photo Tips</p>
        <ul className="mt-1 space-y-0.5 text-xs text-[var(--muted-foreground)]">
          <li>• Include exterior, all rooms, garden, and street view</li>
          <li>• Use landscape orientation and natural lighting</li>
          <li>• The first photo will be your listing cover image</li>
        </ul>
      </div>
    </div>
  );
}
