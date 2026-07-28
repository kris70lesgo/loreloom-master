"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches rendering errors in its child tree and displays a graceful fallback
 * instead of crashing the entire page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            minHeight: "300px",
            padding: "40px",
            textAlign: "center",
            color: "rgba(255,255,255,0.6)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <div
            style={{
              fontSize: "1.2rem",
              marginBottom: "12px",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.06em",
            }}
          >
            ⚠ NARRATIVE COLLAPSE
          </div>
          <p style={{ fontSize: "0.82rem", lineHeight: 1.6, maxWidth: "400px", marginBottom: "20px" }}>
            The narrative engine encountered an unexpected error. The session state is preserved.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: "rgba(176,38,255,0.15)",
              border: "1px solid rgba(176,38,255,0.3)",
              color: "#fff",
              padding: "8px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              transition: "all 0.2s",
            }}
          >
            RETRY → 
          </button>
          {this.state.error && (
            <details style={{ marginTop: "16px", fontSize: "0.65rem", color: "rgba(255,255,255,0.2)", maxWidth: "500px" }}>
              <summary style={{ cursor: "pointer" }}>Error details</summary>
              <pre style={{ marginTop: "8px", padding: "8px", background: "rgba(0,0,0,0.3)", borderRadius: "4px", overflow: "auto", textAlign: "left", whiteSpace: "pre-wrap" }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
