"use client";

import React from "react";
import { User01 as User, Diamond01 as Gem, Palette, Shield01 as Shield } from "@untitledui/icons";

interface EntityDockProps {
  protagonist: string;
  relic: string;
  style: string;
  stability: string;
}

function DockItem({
  icon,
  label,
  value,
  color,
  showDivider,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
  showDivider: boolean;
}) {
  return (
    <>
      {showDivider && (
        <div
          data-testid="dock-divider"
          style={{ width: "1px", height: "22px", background: "rgba(255,255,255,0.04)", margin: "0 8px", flexShrink: 0 }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ color: "rgba(255,255,255,0.3)", display: "inline-flex" }}>{icon}</span>
          <span
            style={{
              fontSize: "0.5rem",
              fontFamily: "var(--font-mono)",
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        </div>
        <span
          data-testid={`dock-value-${label.toLowerCase()}`}
          style={{
            fontSize: "0.7rem",
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
            color: color || "rgba(255,255,255,0.82)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textShadow: color ? `0 0 6px ${color}40` : "none",
          }}
        >
          {value}
        </span>
      </div>
    </>
  );
}

/**
 * Glassmorphic floating dock that displays Entity State Attributes
 * (Protagonist, Relic, Style, Stability) inside the Main Canvas.
 *
 * Renders as a translucent bar positioned at the bottom of the canvas
 * with dividers between each attribute column.
 */
export function EntityDock({ protagonist, relic, style, stability }: EntityDockProps) {
  const items = [
    { icon: <User size={10} data-testid="dock-icon-user" />, key: "Protagonist", val: protagonist },
    { icon: <Gem size={10} data-testid="dock-icon-gem" />, key: "Relic", val: relic },
    { icon: <Palette size={10} data-testid="dock-icon-palette" />, key: "Style", val: style },
    { icon: <Shield size={10} data-testid="dock-icon-shield" />, key: "Stability", val: stability, color: "#00D6FF" },
  ];

  return (
    <div
      data-testid="entity-dock"
      style={{
        position: "absolute",
        bottom: "8px",
        left: "8px",
        right: "8px",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: "0",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "10px",
        padding: "6px 12px",
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      {items.map((item, i) => (
        <DockItem
          key={item.key}
          icon={item.icon}
          label={item.key}
          value={item.val}
          color={item.color}
          showDivider={i > 0}
        />
      ))}
    </div>
  );
}
