"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * Anti-Gravity 3D-Mesh Synthesizer Loader
 *
 * Displays a wireframe cube with pulsing grid lines, counter-rotating
 * orbital rings, and a "◆ Anti-Gravity Synthesis" label. Used on the
 * Main Canvas while an image is being generated.
 */
export function AntiGravitySynthesizer({
  label = "Anti-Gravity Synthesis",
  subtitle = "Mesh Grid :: Neural Feed Active"
}: {
  label?: string;
  subtitle?: string;
}) {
  return (
    <div
      data-testid="anti-gravity-synthesizer"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Pulsing background field */}
      <motion.div
        animate={{ opacity: [0.04, 0.08, 0.04], scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,214,255,0.3) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* 3D wireframe mesh cube */}
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        style={{ position: "absolute", zIndex: 1 }}
        data-testid="synth-svg"
      >
        <defs>
          <linearGradient id="synthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D6FF" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#B026FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00D6FF" stopOpacity="0.4" />
          </linearGradient>
          <filter id="glowMesh">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.rect
          x="20" y="20" width="160" height="160" rx="4"
          fill="none" stroke="url(#synthGrad)" strokeWidth="1.2"
          filter="url(#glowMesh)"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.g
          animate={{ scale: [1, 0.92, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect x="38" y="38" width="124" height="124" rx="3"
            fill="none" stroke="rgba(0,214,255,0.15)" strokeWidth="0.8" />
        </motion.g>
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.line
            key={`gh-${i}`}
            x1={20 + i * 27} y1="20" x2={20 + i * 27} y2="180"
            stroke="rgba(0,214,255,0.06)" strokeWidth="0.5"
            animate={{ opacity: [0.04, 0.12, 0.04] }}
            transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.line
            key={`gv-${i}`}
            x1="20" y1={20 + i * 27} x2="180" y2={20 + i * 27}
            stroke="rgba(176,38,255,0.06)" strokeWidth="0.5"
            animate={{ opacity: [0.04, 0.12, 0.04] }}
            transition={{ duration: 3.5 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
        <motion.line
          x1="20" y1="20" x2="180" y2="180"
          stroke="rgba(176,38,255,0.15)" strokeWidth="1" strokeDasharray="4 4"
          animate={{ opacity: [0.1, 0.3, 0.1], strokeDashoffset: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <motion.line
          x1="180" y1="20" x2="20" y2="180"
          stroke="rgba(0,214,255,0.15)" strokeWidth="1" strokeDasharray="4 4"
          animate={{ opacity: [0.1, 0.3, 0.1], strokeDashoffset: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle
          cx="100" cy="100" r="4" fill="#00D6FF"
          style={{ transformOrigin: "100px 100px" }}
          animate={{ scale: [0.875, 1.25, 0.875], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        {[20, 180].map((x) =>
          [20, 180].map((y) => (
            <circle key={`cn-${x}-${y}`} cx={x} cy={y} r="2.5" fill="#B026FF" opacity="0.6" />
          ))
        )}
      </svg>

      {/* Orbiting ring 1 */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          width: "170px",
          height: "170px",
          borderRadius: "50%",
          border: "1px solid rgba(0,214,255,0.15)",
          borderTop: "2px solid rgba(0,214,255,0.5)",
          zIndex: 2,
        }}
      />
      {/* Orbiting ring 2 (counter-rotating) */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          width: "130px",
          height: "130px",
          borderRadius: "50%",
          border: "1px solid rgba(176,38,255,0.12)",
          borderRight: "2px solid rgba(176,38,255,0.4)",
          zIndex: 2,
        }}
      />

      {/* Pulsing label */}
      <div
        style={{
          zIndex: 3,
          marginTop: "170px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
        }}
      >
          {label && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              style={{
                fontSize: "0.65rem",
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
              }}
            >
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                style={{ display: "inline-block", marginRight: "6px" }}
              >
                ◆
              </motion.span>
              {label}
            </motion.span>
          )}
          {subtitle && (
            <span
              data-testid="synth-subtitle"
              style={{
                fontSize: "0.52rem",
                fontFamily: "var(--font-mono)",
                color: "rgba(255,255,255,0.25)",
                letterSpacing: "0.1em",
              }}
            >
              {subtitle}
            </span>
          )}
      </div>
    </div>
  );
}
