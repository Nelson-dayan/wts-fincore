"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readResponseJson } from "@/lib/http/read-response-json";
import { ProjectSearchPicker } from "@/components/portals/project-search-picker";
import { Select } from "@/components/ui/select";

export type CreateRecordFieldConfig =
  | {
      name: string;
      label: string;
      type?: "text" | "email" | "number";
      required?: boolean;
    }
  | {
      name: string;
      label: string;
      type: "projectSearch";
      required?: boolean;
      /** Shown under the project search (optional). */
      helperText?: string;
    }
  | {
      name: string;
      label: string;
      type: "select";
      options: Array<{ value: string; label: string }>;
      required?: boolean;
    };

export function CreateRecordForm({
  title,
  endpoint,
  fields,
  initialValues = {},
}: {
  title: string;
  endpoint: string;
  fields: CreateRecordFieldConfig[];
  initialValues?: Record<string, string>;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [values, setValues] = useState<Record<string, string>>(() => {
    const vals = { ...initialValues };
    for (const f of fields) {
      if (f.type === "select" && !vals[f.name] && f.options.length > 0) {
        vals[f.name] = f.options[0].value;
      }
    }
    return vals;
  });

  useEffect(() => {
    if (initialValues) {
      setValues((prev) => {
        const nextValues = { ...prev };
        let hasDiff = false;
        for (const key of Object.keys(initialValues)) {
          if (prev[key] !== initialValues[key]) {
            nextValues[key] = initialValues[key];
            hasDiff = true;
          }
        }
        for (const f of fields) {
          if (f.type === "select" && !nextValues[f.name] && f.options.length > 0) {
            nextValues[f.name] = f.options[0].value;
            hasDiff = true;
          }
        }
        return hasDiff ? nextValues : prev;
      });
    }
  }, [initialValues, fields]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        const value = values[field.name] ?? "";
        payload[field.name] =
          field.type === "number" ? Number(value || 0) : value;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(result.message ?? "Create failed");
      setMessage("Created successfully. Refreshing...");
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.name}
              className={field.type === "projectSearch" ? "space-y-1 sm:col-span-2" : "space-y-1"}
            >
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === "projectSearch" ? (
                <ProjectSearchPicker
                  id={field.name}
                  value={values[field.name] ?? ""}
                  disabled={pending}
                  onChange={(id) => setValues((prev) => ({ ...prev, [field.name]: id }))}
                  helperText={
                    field.helperText ??
                    "Optional. Search by project name — no need to copy an ID from elsewhere."
                  }
                />
              ) : field.type === "select" ? (
                <Select
                  id={field.name}
                  disabled={pending}
                  required={field.required}
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                  options={field.options}
                />
              ) : (
                <Input
                  id={field.name}
                  type={field.type ?? "text"}
                  required={field.required}
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Create"}
            </Button>
            {message ? (
              <p className="text-sm text-muted-foreground">{message}</p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
