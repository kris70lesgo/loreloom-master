"use client";

import React from "react";
import { AntiGravitySynthesizer } from "./AntiGravitySynthesizer";
import { VisualSynthesisOverlay } from "./VisualSynthesisOverlay";

/**
 * Procedural SVG graphic component for the Main Canvas.
 *
 * Renders different SVG scenes based on the `seed` string:
 * - Empty/awaiting seeds → AntiGravitySynthesizer with ghost loading
 * - http / path URLs → image tag
 * - Seeds containing "grid" or "tokyo" → neon-grid SVG
 * - Seeds containing "cathedral" or "matrix" → cyber-gate SVG
 * - Seeds containing "islands", "sky", or "aether" → golden-islands SVG
 * - Everything else → core-glow SVG
 */
export function VisualCanonGraphic({
  seed,
  onRetrigger,
  previousSeed,
  isGenerating = false,
  progress,
}: {
  seed: string;
  onRetrigger?: () => void;
  previousSeed?: string;
  isGenerating?: boolean;
  progress?: number;
}) {
  const isAwaiting = !seed || seed === "nexus-core" || seed === "awaiting-synthesis" || isGenerating;

  if (isAwaiting) {
    return (
      <div data-testid="vcg-awaiting" style={{ 
        width: "100%", 
        height: "100%", 
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--card-bg)"
      }}>
        {previousSeed && previousSeed.startsWith("http") && (
          <div style={{ position: "absolute", inset: 0, opacity: 0.15, filter: "grayscale(1) blur(2px)" }}>
            <img src={previousSeed} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        {(isGenerating || seed === "awaiting-synthesis") ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div className="loader-wrapper" style={{ transform: "scale(0.85)", margin: 0 }}>
              <span className="loader-letter">G</span>
              <span className="loader-letter">e</span>
              <span className="loader-letter">n</span>
              <span className="loader-letter">e</span>
              <span className="loader-letter">r</span>
              <span className="loader-letter">a</span>
              <span className="loader-letter">t</span>
              <span className="loader-letter">i</span>
              <span className="loader-letter">n</span>
              <span className="loader-letter">g</span>
              <div className="loader" />
            </div>
            {progress !== undefined && progress > 0 && (
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8rem",
                color: "#00D6FF",
                textShadow: "0 0 10px rgba(0, 214, 255, 0.4)",
                fontWeight: 600,
                letterSpacing: "0.1em"
              }}>
                {progress}%
              </div>
            )}
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%", background: "var(--card-bg)" }} />
        )}
      </div>
    );
  }

  if (seed && (seed.startsWith("http") || seed.startsWith("/") || seed.includes("/"))) {
    const imgSrc = seed.startsWith("ipfs://") 
      ? `https://gateway.pinata.cloud/ipfs/${seed.slice(7)}` 
      : seed;
      
    return (
      <div data-testid="vcg-image" style={{ width: "100%", height: "100%", position: "relative" }}>
        <img
          src={imgSrc}
          alt="Visual Synthesis Render"
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px", display: "block" }}
        />
      </div>
    );
  }

  return (
    <div data-testid="vcg-core" style={{ width: "100%", height: "100%", position: "relative", background: "rgba(0,0,0,0.1)", borderRadius: "10px" }} />
  );
}
