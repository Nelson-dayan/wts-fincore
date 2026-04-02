"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
import { QuotationProjectConnector } from "@/components/quotation/QuotationProjectConnector";
import {
  getQuotationPagePx,
  getQuotationPreviewStackHeightPx,
} from "@/lib/quotation/page-layout";
import { exportQuotationPdf } from "@/utils/exportPdf";
import { readResponseJson } from "@/lib/http/read-response-json";

type PrimaryCompanySettings = {
  name?: string;
  address?: string;
  contactName?: string;
  email?: string;
  logoText?: string;
};

function pdfSafeName(ref: string) {
  const base = ref.trim() || "draft";
  return base.replace(/[^\w\-]+/g, "_").slice(0, 80) || "draft";
}

function applyPrimaryCompanyDefaults(
  current: QuotationData,
  company: PrimaryCompanySettings | null
): QuotationData {
  if (!company) return current;
  return {
    ...current,
    companyName: current.companyName.trim() ? current.companyName : String(company.name ?? ""),
    companyAddress: current.companyAddress.trim()
      ? current.companyAddress
      : String(company.address ?? ""),
    contactName: current.contactName.trim()
      ? current.contactName
      : String(company.contactName ?? ""),
    contactEmail: current.contactEmail.trim() ? current.contactEmail : String(company.email ?? ""),
    logo:
      typeof current.logo === "string" && current.logo.trim()
        ? current.logo
        : String(company.logoText ?? "") || undefined,
  };
}

export type QuotationBuilderPanelProps = {
  /** Full page: show header + back link. Embedded: section title only (e.g. admin quotations). */
  variant?: "standalone" | "embedded";
  /** Prefer this project when saving (e.g. from Admin ?projectId=). Server falls back to first project if empty. */
  initialSaveProjectId?: string;
  /** When set, Save updates this record (same quotation, no duplicate). */
  editingQuotationId?: string | null;
  /** Seed form when opening the builder (e.g. Load from admin table). Prefer remounting parent `key` when this changes. */
  initialSnapshot?: QuotationData | null;
  onDbSaveSuccess?: (info: {
    quotationId: string;
    quotationNumber: string;
    created: boolean;
  }) => void;
  /** Embedded: closes the builder / clears edit mode. */
  onCancelEdit?: () => void;
};

export function QuotationBuilderPanel({
  variant = "standalone",
  initialSaveProjectId = "",
  editingQuotationId = null,
  initialSnapshot = null,
  onDbSaveSuccess,
  onCancelEdit,
}: QuotationBuilderPanelProps) {
  const [data, setData] = useState<QuotationData>(() =>
    initialSnapshot ? normalizeQuotationData(initialSnapshot) : defaultQuotationData()
  );
  const [connectedProjectId, setConnectedProjectId] = useState<string>(
    initialSaveProjectId.trim()
  );
  const [connectedProjectName, setConnectedProjectName] = useState<string>("");
  const [projectDefaultsLoading, setProjectDefaultsLoading] = useState(false);
  const [projectDefaultsError, setProjectDefaultsError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [primaryDefaults, setPrimaryDefaults] = useState<PrimaryCompanySettings | null>(null);
  const saveNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** After a DB save we clear localStorage; skip the next persist so the draft is not immediately re-written. */
  const skipNextLocalPersistRef = useRef(false);
  const lastLocalSerializedRef = useRef<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  /** Full-scale capture root — must not sit under CSS `transform: scale(...)`. */
  const exportCaptureRef = useRef<HTMLDivElement>(null);

  const loadProjectDefaults = useCallback(
    async (projectId: string, opts: { force?: boolean } = {}) => {
      const pid = projectId.trim();
      if (!pid) return;

      const force = Boolean(opts.force);
      setProjectDefaultsLoading(true);
      setProjectDefaultsError(null);
      try {
        const res = await fetch(`/api/admin/projects/${encodeURIComponent(pid)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await readResponseJson<{
          project?: { name?: string };
          client?: { name?: string; company?: string };
          message?: string;
        }>(res);

        if (!res.ok) {
          throw new Error(payload.message ?? "Failed to load project defaults");
        }

        const projectName = String(payload.project?.name ?? "").trim();
        const clientName = String(payload.client?.name ?? "").trim();
        const clientCompany = String(payload.client?.company ?? "").trim();

        setConnectedProjectName(projectName || pid);

        if (force) {
          setData((prev) => ({
            ...prev,
            page1Title: projectName,
            clientName: clientCompany || clientName,
            contactName: clientName,
          }));
        } else {
          setData((prev) => {
            const next = { ...prev };
            if (!next.page1Title.trim() && projectName) next.page1Title = projectName;
            if (!next.clientName.trim() && (clientCompany || clientName)) {
              next.clientName = clientCompany || clientName;
            }
            if (!next.contactName.trim() && clientName) next.contactName = clientName;
            return next;
          });
        }
      } catch (e) {
        setProjectDefaultsError(e instanceof Error ? e.message : "Failed to load project defaults");
      } finally {
        setProjectDefaultsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    try {
      if (initialSnapshot) {
        setData(normalizeQuotationData(initialSnapshot));
      } else {
        const raw = localStorage.getItem(QUOTATION_STORAGE_KEY);
        if (raw) setData(normalizeQuotationData(JSON.parse(raw)));
        else setData(defaultQuotationData());
      }
    } catch {
      setData(
        initialSnapshot ? normalizeQuotationData(initialSnapshot) : defaultQuotationData()
      );
    }
    setStorageReady(true);
  }, [initialSnapshot]);

  useEffect(() => {
    if (!storageReady) return;
    const serialized = JSON.stringify(data);
    if (skipNextLocalPersistRef.current) {
      skipNextLocalPersistRef.current = false;
      lastLocalSerializedRef.current = serialized;
      return;
    }
    if (lastLocalSerializedRef.current === serialized) return;
    lastLocalSerializedRef.current = serialized;
    try {
      localStorage.setItem(QUOTATION_STORAGE_KEY, serialized);
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
      saveNoticeTimerRef.current = setTimeout(() => {
        setSaveNotice(null);
        saveNoticeTimerRef.current = null;
      }, 2800);
    };
    window.addEventListener(QUOTATION_PDF_LOAD_DRAFT, onLoadDraft as EventListener);
    return () =>
      window.removeEventListener(QUOTATION_PDF_LOAD_DRAFT, onLoadDraft as EventListener);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/company", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const payload = await readResponseJson<{ item?: PrimaryCompanySettings }>(res);
        const next = payload.item ?? null;
        if (!alive || !next) return;
        setPrimaryDefaults(next);
        if (initialSnapshot || editingQuotationId) return;
        setData((prev) => applyPrimaryCompanyDefaults(prev, next));
      } catch {
        /* optional defaults only */
      }
    })();
    return () => {
      alive = false;
    };
  }, [editingQuotationId, initialSnapshot]);

  const didAutoLoadDefaultsRef = useRef(false);
  useEffect(() => {
    // When opened from `?projectId=...`, auto-load defaults once (only fill empty fields).
    if (didAutoLoadDefaultsRef.current) return;
    if (editingQuotationId || initialSnapshot) return;

    const pid = initialSaveProjectId.trim();
    if (!pid) return;
    if (!connectedProjectId.trim()) return;

    didAutoLoadDefaultsRef.current = true;
    void loadProjectDefaults(pid, { force: true });
  }, [
    connectedProjectId,
    editingQuotationId,
    initialSaveProjectId,
    initialSnapshot,
    loadProjectDefaults,
  ]);

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

    const isEmbedded = variant === "embedded";
    let localMsg = "Draft kept in this browser until it is saved to the database.";

    if (!isEmbedded) {
      try {
        appendSavedPdfQuotation(data);
        window.dispatchEvent(new Event(QUOTATION_PDF_SAVES_CHANGED));
        localMsg = "Draft saved in this browser.";
      } catch {
        localMsg =
          "Draft updated. Saved list full — remove an old entry or use a smaller logo.";
      }
    }

    try {
      const res = await fetch("/api/admin/quotations/from-builder", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: connectedProjectId.trim() || undefined,
          quotationId: editingQuotationId?.trim() || undefined,
          data,
          status: "sent",
        }),
      });
      const json = await readResponseJson<{
        message?: string;
        item?: { _id?: string; quotationNumber?: string };
      }>(res);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setSaveNotice(
            `${localMsg} Sign in as admin to save this quotation to the database.`
          );
        } else {
          setSaveNotice(`${localMsg} Database: ${json.message ?? "save failed"}.`);
        }
        saveNoticeTimerRef.current = setTimeout(() => {
          setSaveNotice(null);
          saveNoticeTimerRef.current = null;
        }, 5600);
        return;
      }

      try {
        localStorage.removeItem(QUOTATION_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      skipNextLocalPersistRef.current = true;

      const qid = String(json.item?._id ?? "");
      const qn = String(json.item?.quotationNumber ?? "");
      const created = res.status === 201;
      onDbSaveSuccess?.({
        quotationId: qid,
        quotationNumber: qn,
        created,
      });

      setSaveNotice(
        qn
          ? `Saved to database as ${qn}. Local draft cleared.`
          : "Saved to database. Local draft cleared."
      );
    } catch (e) {
      setSaveNotice(
        `${localMsg} Database: ${e instanceof Error ? e.message : "request failed"}.`
      );
    }

    saveNoticeTimerRef.current = setTimeout(() => {
      setSaveNotice(null);
      saveNoticeTimerRef.current = null;
    }, 5200);
  }, [data, connectedProjectId, editingQuotationId, onDbSaveSuccess, variant]);

  const handleReset = useCallback(() => {
    const base = defaultQuotationData();
    setData(applyPrimaryCompanyDefaults(base, primaryDefaults));
    try {
      localStorage.removeItem(QUOTATION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (connectedProjectId.trim()) {
      void loadProjectDefaults(connectedProjectId, { force: false });
    }
  }, [connectedProjectId, primaryDefaults, loadProjectDefaults]);

  const handleDownloadPdf = useCallback(async () => {
    const root = exportCaptureRef.current ?? previewRef.current;
    if (!root) {
      setPdfError("Preview is not ready. Wait a moment and try again.");
      return;
    }
    setPdfError(null);
    setExporting(true);
    try {
      await exportQuotationPdf(root, `quotation_${pdfSafeName(data.refNo)}.pdf`, {
        format: data.pageFormat,
        orientation: data.pageOrientation,
      });
    } catch (e) {
      console.error(e);
      setPdfError(e instanceof Error ? e.message : "Could not create PDF.");
    } finally {
      setExporting(false);
    }
  }, [data.pageFormat, data.pageOrientation, data.refNo]);

  if (!storageReady) {
    return (
      <div className="flex min-h-50 items-center justify-center text-muted-foreground text-sm">
        Loading quotation builder…
      </div>
    );
  }

  const isStandalone = variant === "standalone";
  const isEditMode = Boolean(editingQuotationId);
  const formTitle = isEditMode ? "Edit quotation" : "New quotation";
  const previewPagePx = getQuotationPagePx(data);
  const previewStackHeightPx = getQuotationPreviewStackHeightPx(previewPagePx.height);
  const previewViewportStyle = {
    "--qv-page-w": `${previewPagePx.width}px`,
    "--qv-stack-h": `${previewStackHeightPx}px`,
  } as CSSProperties;

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
                Form above · three pages · PDF format/orientation configurable
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
          <h2 className="text-lg font-semibold tracking-tight">{formTitle}</h2>
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

          <div
            ref={exportCaptureRef}
            aria-hidden
            className="pointer-events-none fixed -left-2499.75 top-0 flex flex-col gap-10 opacity-[0.01]"
          >
            <QuotationPreview data={data} />
          </div>

          <div className="flex flex-col gap-4">
            {projectDefaultsError ? (
              <p className="text-destructive text-sm" role="alert">
                {projectDefaultsError}
              </p>
            ) : null}
            <QuotationProjectConnector
              connectedProjectId={connectedProjectId}
              connectedProjectName={connectedProjectName}
              defaultsLoading={projectDefaultsLoading}
              onConnectProject={(pid) => {
                setConnectedProjectId(pid);
                void loadProjectDefaults(pid, { force: true });
              }}
              onClearConnection={() => {
                setConnectedProjectId("");
                setConnectedProjectName("");
                setProjectDefaultsError(null);
              }}
            />
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
            formTitle={formTitle}
            onCancelEdit={onCancelEdit}
          />

          <div className="flex w-full flex-col items-stretch rounded-xl border border-border/50 bg-muted/15 p-4 sm:p-5 dark:bg-muted/10">
            <p className="text-muted-foreground mb-3 text-center text-[11px] font-semibold uppercase tracking-wider">
              Live preview — 3 pages ({data.pageFormat.toUpperCase()} {data.pageOrientation})
            </p>
            <div className="min-h-[min(88vh,900px)] w-full max-w-full overflow-x-hidden overflow-y-auto [-webkit-overflow-scrolling:touch]">
              <div className="mx-auto flex max-w-full justify-center pb-10 pt-2">
                <div
                  className="quotation-preview-scale-viewport shrink-0"
                  style={previewViewportStyle}
                >
                  <div className="quotation-preview-scale-inner">
                    <QuotationPreview ref={previewRef} data={data} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
