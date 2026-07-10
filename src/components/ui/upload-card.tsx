"use client";

import * as React from "react";
import {
  ImagePlus,
  Trash2,
  UploadCloud,
  Loader2,
} from "lucide-react";

import { readFileAsPdfSafeDataUrl } from "@/lib/portals/read-file-as-pdf-safe-data-url";

type UploadCardProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function UploadCard({
  label,
  value,
  onChange,
  placeholder = "Upload image",
}: UploadCardProps) {
  const inputRef =
    React.useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] =
    React.useState(false);

  const [isUploading, setIsUploading] =
    React.useState(false);

  const [progress, setProgress] =
    React.useState(0);

  const simulateProgress = () => {
    let current = 0;

    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 15);

      if (current >= 90) {
        clearInterval(interval);
      } else {
        setProgress(current);
      }
    }, 120);

    return interval;
  };

  const processFile = async (file: File) => {
    try {
      setIsUploading(true);
      setProgress(0);

      const progressInterval =
        simulateProgress();

      const safeDataUrl =
        await readFileAsPdfSafeDataUrl(file);

      clearInterval(progressInterval);

      setProgress(100);

      setTimeout(() => {
        onChange(safeDataUrl);

        setIsUploading(false);

        setProgress(0);
      }, 400);
    } catch (error) {
      console.error(
        "Failed to read file",
        error
      );

      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    await processFile(file);

    e.target.value = "";
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();

    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];

    if (!file) return;

    await processFile(file);
  };

  return (
    <div
      className={`group overflow-hidden rounded-[28px] border bg-background shadow-sm transition-all duration-300
      ${isDragging
          ? "scale-[1.01] border-primary shadow-2xl shadow-primary/10"
          : "border-border/50 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
        }`}
    >
      {/* Preview Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() =>
          setIsDragging(false)
        }
        onDrop={handleDrop}
        className={`relative flex h-[240px] items-center justify-center overflow-hidden transition-all duration-300
        ${isDragging
            ? "bg-primary/5"
            : "bg-gradient-to-br from-muted/40 via-background to-muted/20"
          }`}
      >
        {/* Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Uploading Skeleton */}
        {isUploading ? (
          <div className="relative z-10 flex w-full max-w-[260px] flex-col items-center gap-6">

            {/* Skeleton Preview */}
            <div className="h-24 w-24 animate-pulse rounded-3xl bg-muted" />

            <div className="w-full space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">

                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Uploading asset...
                </span>

                <span>
                  {progress}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />

              Processing file
            </div>
          </div>
        ) : value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label}
              className="relative z-10 max-h-[130px] max-w-[80%] object-contain transition-transform duration-300 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/5" />
          </>
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-5 text-center">

            <div
              className={`flex h-24 w-24 items-center justify-center rounded-[28px] border bg-background shadow-sm transition-all duration-300
              ${isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border/50"
                }`}
            >
              <ImagePlus
                className={`h-11 w-11 transition-colors duration-300
                ${isDragging
                    ? "text-primary"
                    : "text-muted-foreground"
                  }`}
              />
            </div>

            <div>
              <h4 className="text-lg font-semibold">
                {isDragging
                  ? "Drop file here"
                  : label}
              </h4>

              <p className="mt-2 text-sm text-muted-foreground">
                {isDragging
                  ? "Release to upload asset"
                  : placeholder}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="space-y-4 p-5">

        <div className="flex items-center justify-between">

          <div>
            <p className="text-sm font-semibold">
              {label}
            </p>

            <p className="text-xs text-muted-foreground">
              PNG, JPG, SVG • Max 2MB
            </p>
          </div>

          {value && !isUploading && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background text-muted-foreground transition hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Upload Button */}
        <button
          type="button"
          disabled={isUploading}
          onClick={() =>
            inputRef.current?.click()
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border/50 bg-muted/30 text-sm font-medium transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" />

              {value
                ? "Replace Asset"
                : "Upload Asset"}
            </>
          )}
        </button>

        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}