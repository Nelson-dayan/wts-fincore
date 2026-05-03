"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const safeDataUrl = await readFileAsPdfSafeDataUrl(file);
      onChange(safeDataUrl);
    } catch (error) {
      console.error("Failed to read file", error);
    }

    e.target.value = "";
  };

  return (
    <div className="group relative rounded-2xl border border-border/70 bg-background/60 p-4 transition hover:border-primary/40 hover:shadow-md">
      
      <Label className="text-sm font-medium text-foreground">
        {label}
      </Label>

      <div className="mt-3 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-center transition group-hover:border-primary/50">
        
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={label}
            className="h-12 max-w-[140px] object-contain"
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {placeholder}
          </span>
        )}

        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="cursor-pointer text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-white hover:file:bg-primary/90"
        />

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-red-500 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
