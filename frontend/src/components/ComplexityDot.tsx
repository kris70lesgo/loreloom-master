"use client";

import React from "react";
import { motion } from "framer-motion";

const COLORS = [
  "rgba(255,255,255,0.1)",
  "rgba(0,214,255,0.5)",
  "rgba(0,214,255,0.8)",
  "rgba(176,38,255,0.7)",
  "rgba(176,38,255,0.9)",
];

const LABELS = ["", "SIMPLE", "MODERATE", "COMPLEX", "DEEP"];

const PULSES = [0, 1, 1.5, 2, 2.5];

export type ComplexityLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Compute the complexity level of a prompt string.
 *
 * - 0: empty
 * - 1: < 30 characters
 * - 2: < 80 characters
 * - 3: < 150 characters
 * - 4: 150+ characters
 */
export function computeComplexity(text: string): ComplexityLevel {
  const len = text.trim().length;
  if (len === 0) return 0;
  if (len < 30) return 1;
  if (len < 80) return 2;
  if (len < 150) return 3;
  return 4;
}

/**
 * A minimalist dot + label indicator that shows how much
 * narrative weight the AI is processing.
 *
 * Renders nothing when `text` is empty.
 */
export function ComplexityDot({ text }: { text: string }) {
  const level = computeComplexity(text);

  if (level === 0) return null;

  return (
    <div
      data-testid="complexity-dot"
      style={{ display: "flex", alignItems: "center", gap: "5px" }}
    >
      <div
        style={{
          position: "relative",
          width: 8,
          height: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          animate={{ scale: [1, 1 + PULSES[level] * 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: COLORS[level],
            boxShadow: `0 0 8px ${COLORS[level]}`,
          }}
        />
      </div>
      <span
        data-testid="complexity-label"
        style={{
          fontSize: "0.52rem",
          fontFamily: "var(--font-mono)",
          color: COLORS[level],
          letterSpacing: "0.08em",
        }}
      >
        {LABELS[level]}
      </span>
      <span
        data-testid="complexity-chars"
        style={{
          fontSize: "0.48rem",
          fontFamily: "var(--font-mono)",
          color: "rgba(255,255,255,0.15)",
          marginLeft: "2px",
        }}
      >
        {text.trim().length}ch
      </span>
    </div>
  );
}
