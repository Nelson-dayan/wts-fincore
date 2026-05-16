"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Info, Home } from "lucide-react";
import { formatCurrency } from "@/lib/finance/engine";

export default function StyleGuidePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Style Guide</h1>
        <p className="text-muted-foreground mt-2">A live reference of the application's UI components, tokens, and finance patterns.</p>
      </div>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Badges / Statuses</h2>
        <div className="flex flex-wrap gap-4">
          <Badge variant="default">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      {/* Forms */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Forms</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Standard Input</label>
              <Input placeholder="Enter your name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Disabled Input</label>
              <Input placeholder="You cannot type here" disabled />
            </div>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Cards</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Standard Card</CardTitle>
              <CardDescription>This is a standard card description.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Card content goes here. You can put forms, text, or anything else.</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Action</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Finance UI Patterns */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Finance Patterns</h2>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Currency Formatting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Subtotal</span>
              <span className="font-mono">{formatCurrency(12500.5)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Tax (5%)</span>
              <span className="font-mono text-red-500">+{formatCurrency(625.025)}</span>
            </div>
            <div className="flex justify-between items-center py-2 font-bold text-lg">
              <span>Total</span>
              <span className="font-mono text-primary">{formatCurrency(13125.525)}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Feedback & Error Boundaries */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Feedback & Errors</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 flex items-start gap-4">
             <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
             <div>
               <h3 className="font-bold text-red-700 dark:text-red-400">Critical Error</h3>
               <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                 This simulates what a boundary or inline alert looks like.
               </p>
             </div>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-6 flex items-start gap-4">
             <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
             <div>
               <h3 className="font-bold text-green-700 dark:text-green-400">Success</h3>
               <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">
                 Action completed successfully.
               </p>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
