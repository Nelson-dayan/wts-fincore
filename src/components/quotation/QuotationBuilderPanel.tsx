"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { QuotationForm } from "@/components/quotation/QuotationForm";
import { QuotationPdfSavedListCard } from "@/components/quotation/QuotationPdfSavedListCard";
import { QuotationPreview } from "@/components/quotation/QuotationPreview";
import {
  appendSavedPdfQuotation,
  QUOTATION_PDF_LOAD_DRAFT,
  QUOTATION_PDF_SAVES_CHANGED,
} from "@/lib/quotation/pdf-saved-list";
import {
  defaultQuotationData,
  normalizeQuotationData,
  QUOTATION_STORAGE_KEY,
  type QuotationData,
} from "@/types/quotation-generator";
import { exportQuotationPdf } from "@/utils/exportPdf";

function pdfSafeName(ref: string) {
  const base = ref.trim() || "draft";
  return base.replace(/[^\w\-]+/g, "_").slice(0, 80) || "draft";
}

export type QuotationBuilderPanelProps = {
  /** Full page: show header + back link. Embedded: section title only (e.g. admin quotations). */
  variant?: "standalone" | "embedded";
  /** Pre-select project for database save (e.g. from Admin quotations ?projectId=). */
  initialSaveProjectId?: string;
};

type ProjectOption = { _id: string; name: string };

export function QuotationBuilderPanel({
  variant = "standalone",
  initialSaveProjectId = "",
}: QuotationBuilderPanelProps) {
  const [data, setData] = useState<QuotationData>(() => defaultQuotationData());
  const [storageReady, setStorageReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [saveProjectId, setSaveProjectId] = useState("");
  const [dbListOk, setDbListOk] = useState<boolean | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const saveNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  /** Full-scale capture root — must not sit under CSS `transform: scale(...)`. */
  const exportCaptureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUOTATION_STORAGE_KEY);
      if (raw) setData(normalizeQuotationData(JSON.parse(raw)));
    } catch {
      /* ignore corrupt storage */
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* quota or private mode */
    }
  }, [data, storageReady]);

  useEffect(() => {
    return () => {
      if (saveNoticeTimerRef.current) clearTimeout(saveNoticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/projects?page=1&limit=300&q=", {
          credentials: "include",
          cache: "no-store",
        });
        if (!alive) return;
        if (!res.ok) {
          setDbListOk(false);
          setProjects([]);
          return;
        }
        const payload = (await res.json()) as {
          items?: Array<{ _id?: string; name?: string }>;
        };
        const list = (payload.items ?? []).map((p) => ({
          _id: String(p._id ?? ""),
          name: String(p.name ?? "Project"),
        }));
        setProjects(list.filter((p) => p._id));
        setDbListOk(true);
      } catch {
        if (alive) {
          setDbListOk(false);
          setProjects([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const id = initialSaveProjectId.trim();
    if (id) setSaveProjectId(id);
  }, [initialSaveProjectId]);

  useEffect(() => {
    const onLoadDraft = (e: Event) => {
      const ce = e as CustomEvent<{ data: QuotationData }>;
      if (!ce.detail?.data) return;
      if (saveNoticeTimerRef.current) {
        clearTimeout(saveNoticeTimerRef.current);
        saveNoticeTimerRef.current = null;
      }
      const next = normalizeQuotationData(ce.detail.data);
      setData(next);
      try {
        localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      setSaveNotice("Loaded saved quotation.");
      if (saveNoticeTimerRef.current) clearTimeout(saveNoticeTimerRef.current);
      saveNoticeTimerRef.current = setTimeout(() => {
        setSaveNotice(null);
        saveNoticeTimerRef.current = null;
      }, 2800);
    };
    window.addEventListener(QUOTATION_PDF_LOAD_DRAFT, onLoadDraft as EventListener);
    return () =>
      window.removeEventListener(QUOTATION_PDF_LOAD_DRAFT, onLoadDraft as EventListener);
  }, []);

  const handleSaveQuotation = useCallback(async () => {
    if (saveNoticeTimerRef.current) {
      clearTimeout(saveNoticeTimerRef.current);
      saveNoticeTimerRef.current = null;
    }
    try {
      localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(data));
    } catch {
      setSaveNotice("Could not save draft. Storage may be full or private mode is on.");
      saveNoticeTimerRef.current = setTimeout(() => {
        setSaveNotice(null);
        saveNoticeTimerRef.current = null;
      }, 4000);
      return;
    }
    let localMsg = "Saved in this browser.";
    try {
      appendSavedPdfQuotation(data);
      window.dispatchEvent(new Event(QUOTATION_PDF_SAVES_CHANGED));
    } catch {
      localMsg =
        "Draft updated. Saved list full — remove an old entry or use a smaller logo.";
    }

    let dbPart = "";
    if (dbListOk && saveProjectId.trim()) {
      try {
        const res = await fetch("/api/admin/quotations/from-builder", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: saveProjectId.trim(),
            data,
            status: "sent",
          }),
        });
        const raw = await res.text();
        const json = raw ? (JSON.parse(raw) as { message?: string; item?: { quotationNumber?: string } }) : {};
        if (!res.ok) throw new Error(json.message ?? "Database save failed");
        const qn = json.item?.quotationNumber ?? "";
        dbPart = qn ? ` Also in database: ${qn} (use on Purchase orders).` : " Also saved to database.";
      } catch (e) {
        dbPart = ` Database: ${e instanceof Error ? e.message : "failed"}.`;
      }
    } else if (dbListOk && projects.length > 0) {
      dbPart = " Choose a project above to copy this quotation into the database for POs.";
    } else if (dbListOk === false) {
      dbPart = " Sign in as admin to save the same quotation to the database for POs.";
    }

    setSaveNotice(localMsg + dbPart);
    saveNoticeTimerRef.current = setTimeout(() => {
      setSaveNotice(null);
      saveNoticeTimerRef.current = null;
    }, 5200);
  }, [data, dbListOk, projects.length, saveProjectId]);

  const handleReset = useCallback(() => {
    setData(defaultQuotationData());
    try {
      localStorage.removeItem(QUOTATION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    const root = exportCaptureRef.current ?? previewRef.current;
    if (!root) {
      setPdfError("Preview is not ready. Wait a moment and try again.");
      return;
    }
    setPdfError(null);
    setExporting(true);
    try {
      await exportQuotationPdf(root, `quotation_${pdfSafeName(data.refNo)}.pdf`);
    } catch (e) {
      console.error(e);
      setPdfError(e instanceof Error ? e.message : "Could not create PDF.");
    } finally {
      setExporting(false);
    }
  }, [data.refNo]);

  if (!storageReady) {
    return (
      <div className="flex min-h-50 items-center justify-center text-muted-foreground text-sm">
        Loading quotation builder…
      </div>
    );
  }

  const isStandalone = variant === "standalone";

  return (
    <div className={isStandalone ? "min-h-dvh bg-muted/25" : ""}>
      {isStandalone ? (
        <header className="border-b border-border/80 bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-(--quotation-shell-max,1600px) flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Quotation generator
              </h1>
              <p className="text-muted-foreground text-sm">
                Form above · three A4 landscape pages (1123×794 px) · one PDF
              </p>
            </div>
            <Link
              href="/"
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              Back to home
            </Link>
          </div>
        </header>
      ) : (
        <div className="mb-6 border-b border-border/60 pb-4">
          <h2 className="text-lg font-semibold tracking-tight">New quotation</h2>
        </div>
      )}

      <div
        className={
          isStandalone
            ? "mx-auto max-w-(--quotation-shell-max,1600px) px-4 py-6 sm:px-6 sm:py-8"
            : ""
        }
      >
        <div className="flex flex-col gap-10">
          {isStandalone ? <QuotationPdfSavedListCard alwaysShow /> : null}

          <div className="rounded-xl border border-border/70 bg-card/80 px-4 py-3 shadow-sm">
            <p className="text-foreground mb-2 text-sm font-medium">Database (for Purchase orders)</p>
            {dbListOk === false ? (
              <p className="text-muted-foreground text-sm">
                Sign in as an <strong className="text-foreground">admin</strong> to list projects. Local PDF saves
                stay on this device only.
              </p>
            ) : projects.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No projects yet. Create one under Admin → Projects, then choose it here before Save quotation.
              </p>
            ) : (
              <>
                <label htmlFor="qg-save-project" className="sr-only">
                  Project for database save
                </label>
                <select
                  id="qg-save-project"
                  value={saveProjectId}
                  onChange={(e) => setSaveProjectId(e.target.value)}
                  className="h-10 w-full max-w-md rounded-lg border border-input/90 bg-background px-3 text-sm"
                >
                  <option value="">Save locally only (no database)</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground mt-2 text-xs">
                  With a project selected, Save quotation also writes to the database (PO page quotation dropdown).
                </p>
              </>
            )}
          </div>

          {/* Off-screen 1:1 pages for PDF — avoids html2canvas bugs with scaled preview */}
          <div
            ref={exportCaptureRef}
            aria-hidden
            className="pointer-events-none fixed -left-2499.75 top-0 flex flex-col gap-10 opacity-[0.01]"
          >
            <QuotationPreview data={data} />
          </div>

          <QuotationForm
            data={data}
            onChange={setData}
            onReset={handleReset}
            onSaveQuotation={handleSaveQuotation}
            onDownloadPdf={handleDownloadPdf}
            exporting={exporting}
            saveNotice={saveNotice}
            pdfError={pdfError}
          />

          <div className="flex w-full flex-col items-stretch rounded-xl border border-border/50 bg-muted/15 p-4 sm:p-5 dark:bg-muted/10">
            <p className="text-muted-foreground mb-3 text-center text-[11px] font-semibold uppercase tracking-wider">
              Live preview — 3× landscape A4
            </p>
            <div className="min-h-[min(88vh,900px)] w-full overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
              <div className="mx-auto flex w-max max-w-full flex-col items-center pb-10 pt-2">
                <div className="origin-top scale-[0.45] min-[640px]:scale-[0.58] min-[900px]:scale-[0.72] min-[1200px]:scale-[0.88] xl:scale-[0.95] 2xl:scale-100">
                  <QuotationPreview ref={previewRef} data={data} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
