"use client";

import React from "react";
import { motion } from "framer-motion";

export interface NarrativeBeatCardProps {
  /** Label shown above the children, e.g. "NARRATIVE BEAT" or "WEAVE PROMPT" */
  label: string;
  /** CSS color string for the dot indicator */
  dotColor: string;
  /** Optional CSS box-shadow for the dot */
  dotShadow?: string;
  children: React.ReactNode;
  /** When true renders a neon-cyan left accent bar and brightens borders */
  isActive?: boolean;
}

/**
 * A card that displays a narrative beat with a colored dot indicator
 * and an optional neon-cyan left accent bar when `isActive` is true.
 */
export function NarrativeBeatCard({
  label,
  dotColor,
  dotShadow,
  children,
  isActive = false,
}: NarrativeBeatCardProps) {
  return (
    <motion.div
      data-testid="narrative-beat-card"
      initial={false}
      animate={{
        borderColor: isActive
          ? "rgba(0,214,255,0.25)"
          : "rgba(255,255,255,0.03)",
        background: isActive
          ? "rgba(0,214,255,0.03)"
          : "rgba(255,255,255,0.01)",
      }}
      transition={{ duration: 0.3 }}
      style={{
        borderRadius: "10px",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        border: "1px solid",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Neon-cyan left accent bar for active beat */}
      {isActive && (
        <motion.div
          data-testid="beat-accent"
          layoutId="beatAccent"
          style={{
            position: "absolute",
            left: 0,
            top: "10%",
            bottom: "10%",
            width: "3px",
            borderRadius: "0 2px 2px 0",
            background:
              "linear-gradient(180deg, #00D6FF, rgba(0,214,255,0.3))",
            boxShadow: "0 0 10px rgba(0,214,255,0.5)",
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div
          data-testid="beat-dot"
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: dotColor,
            boxShadow: dotShadow || "none",
            flexShrink: 0,
          }}
        />
        <span
          data-testid="beat-label"
          style={{
            fontSize: "0.55rem",
            fontFamily: "var(--font-mono)",
            color: "rgba(255,255,255,0.2)",
            letterSpacing: "0.13em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      {children}
    </motion.div>
  );
}
