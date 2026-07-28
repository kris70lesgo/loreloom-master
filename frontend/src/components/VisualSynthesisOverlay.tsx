"use client";

import React from "react";
import { motion } from "framer-motion";
import { RefreshCw01 as RefreshCw } from "@untitledui/icons";

/**
 * A glassmorphic circular overlay button that appears on the Main Canvas
 * to allow users to re-trigger visual synthesis (image generation).
 *
 * Renders a small, semi-transparent button with a refresh icon,
 * positioned absolutely at the bottom-right of the parent container.
 */
export function VisualSynthesisOverlay({ onRetrigger }: { onRetrigger: () => void }) {
  return (
    <motion.button
      data-testid="visual-synthesis-overlay"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onRetrigger}
      title="Re-trigger Visual Synthesis"
      style={{
        position: "absolute",
        bottom: "12px",
        right: "12px",
        zIndex: 20,
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(0,214,255,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#00D6FF",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        transition: "all 0.2s",
      }}
    >
      <RefreshCw size={14} data-testid="refresh-icon" />
    </motion.button>
  );
}
