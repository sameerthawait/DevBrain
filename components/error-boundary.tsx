"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React component crashed inside ErrorBoundary:", error, errorInfo.componentStack);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div 
          className="p-6 border border-[var(--card-border)] bg-[var(--card-bg)] rounded-[var(--radius-md)] my-4"
          role="alert"
        >
          <h3 className="text-lg font-bold text-red-500 mb-2">Something went wrong.</h3>
          <p className="text-sm text-[var(--foreground)] opacity-80 mb-4">
            An unexpected error occurred in this workspace module.
          </p>
          <button
            className="px-4 py-2 text-xs font-semibold bg-red-500 text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
