"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PageBlock } from "./types";

type LineItemsCardProps = {
  editing: boolean;
  pages: PageBlock[];
  readonlyPages: Array<{ pageNumber: number; items: Array<{ number: number; name: string; quantity: number; price: number }> }>;
  onAddPage: () => void;
  onAddLine: (pageIdx: number) => void;
  onRemoveLine: (pageIdx: number, lineIdx: number) => void;
  onFieldChange: (pageIdx: number, lineIdx: number, field: "number" | "name" | "quantity" | "price", value: number | string) => void;
};

export function LineItemsCard({
  editing,
  pages,
  readonlyPages,
  onAddPage,
  onAddLine,
  onRemoveLine,
  onFieldChange,
}: LineItemsCardProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Line items</CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <>
            {pages.map((page, pageIdx) => (
              <div key={page.pageNumber} className="mb-4 rounded-xl border border-border/70 p-3 last:mb-0">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Page {page.pageNumber}</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => onAddLine(pageIdx)}>
                    Add line
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full max-w-full table-fixed text-left text-sm">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-2">#</th>
                        <th className="py-1 pr-2">Name</th>
                        <th className="py-1 pr-2">Qty</th>
                        <th className="py-1 pr-2">Price</th>
                        <th className="py-1 pr-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {page.items.map((line, lineIdx) => (
                        <tr key={`${page.pageNumber}-${line.number}-${lineIdx}`} className="border-t border-border/60">
                          <td className="py-1 pr-2">
                            <Input
                              className="h-8"
                              type="number"
                              min={1}
                              value={line.number}
                              onChange={(e) => onFieldChange(pageIdx, lineIdx, "number", Number(e.target.value))}
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <Input
                              className="h-8"
                              value={line.name}
                              onChange={(e) => onFieldChange(pageIdx, lineIdx, "name", e.target.value)}
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <Input
                              className="h-8"
                              type="number"
                              min={0}
                              value={line.quantity}
                              onChange={(e) => onFieldChange(pageIdx, lineIdx, "quantity", Number(e.target.value))}
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <Input
                              className="h-8"
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.price}
                              onChange={(e) => onFieldChange(pageIdx, lineIdx, "price", Number(e.target.value))}
                            />
                          </td>
                          <td className="py-1 pr-2 text-right">
                            <Button type="button" size="sm" variant="ghost" onClick={() => onRemoveLine(pageIdx, lineIdx)}>
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={onAddPage}>
              Add page
            </Button>
          </>
        ) : (
          <div className="space-y-3 text-sm">
            {readonlyPages.map((p) => (
              <div key={p.pageNumber}>
                <p className="mb-1 font-medium">Page {p.pageNumber}</p>
                <ul className="list-disc space-y-1 pl-5">
                  {p.items.map((row) => (
                    <li key={row.number}>
                      {row.name} — qty {row.quantity} × {row.price}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
