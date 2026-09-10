"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
          <div>
            <h3 className="text-lg font-bold text-foreground">Component Error</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {this.state.error?.message || "An unexpected error occurred while rendering this component."}
            </p>
          </div>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={this.resetError} className="gap-2">
              <RefreshCcw className="w-4 h-4" /> Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
