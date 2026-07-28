"use client";

import React, { Suspense, useState } from "react";
import { useStory } from "../../../context/StoryContext";
import { Image as LucideImageIcon } from "lucide-react";
import { BookOpen01 as BookOpen, LayersThree01 as Layers, Trash01 as Trash2, XClose as X } from "@untitledui/icons";

// Inline procedural visual canon graphic component
function VisualCanonThumbnail({ seed }: { seed: string }) {
  if (seed.includes("grid") || seed.includes("tokyo")) {
    return (
      <svg width="100%" height="150" viewBox="0 0 200 150" style={{ background: "#06040a", borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}>
        <circle cx="100" cy="75" r="40" fill="rgba(173, 95, 255, 0.2)" />
        <line x1="10" y1="75" x2="190" y2="75" stroke="rgba(173, 95, 255, 0.1)" />
        <line x1="100" y1="10" x2="100" y2="140" stroke="rgba(173, 95, 255, 0.1)" />
      </svg>
    );
  }
  if (seed.includes("cathedral") || seed.includes("matrix")) {
    return (
      <svg width="100%" height="150" viewBox="0 0 200 150" style={{ background: "#03080c", borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}>
        <rect x="60" y="30" width="80" height="90" fill="none" stroke="rgba(0, 214, 255, 0.2)" strokeWidth="1.5" />
        <line x1="20" y1="130" x2="180" y2="130" stroke="rgba(0, 214, 255, 0.1)" />
      </svg>
    );
  }
  return (
    <svg width="100%" height="150" viewBox="0 0 200 150" style={{ background: "#050508", borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}>
      <circle cx="100" cy="75" r="25" fill="none" stroke="rgba(176,38,255,0.2)" strokeWidth="1" />
      <line x1="100" y1="10" x2="100" y2="140" stroke="rgba(255,255,255,0.02)" />
    </svg>
  );
}

function GalleryContent() {
  const { activeWorld, deleteChapter } = useStory();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (!activeWorld) {
    return (
      <div style={styles.emptyContainer}>
        <span style={{ color: "var(--text-secondary)" }}>No Active World Loaded</span>
      </div>
    );
  }

  // Fallback mock cards if chapters are empty, but otherwise use real chapters
  const chaptersToRender = activeWorld.chapters.length > 0 ? activeWorld.chapters : [
    { id: "mock-1", number: 1, title: "The Seeding Matrix", storyText: "The virtual grids spark to life as the core parameters establish connection.", illustrationSeed: "grid-seeding" },
    { id: "mock-2", number: 2, title: "Vector Vaults", storyText: "Deep inside the network spires, memory fragments compile.", illustrationSeed: "cathedral-vaults" }
  ];

  return (
    <div style={styles.container}>
      <div className="blueprint-grid" />
      
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <LucideImageIcon size={24} style={{ color: "var(--accent-purple)", flexShrink: 0 }} />
          <h1 className="title-cyber" style={styles.title}>CANON VISUAL GALLERY</h1>
        </div>
        <p style={styles.subtitle}>Archived visual artifacts and spatial grids of {activeWorld.name}.</p>
      </div>

      {/* Grid configuration */}
      <div style={styles.galleryGrid}>
        {chaptersToRender.map((ch) => (
          <div key={ch.id} className="glass-panel" style={styles.galleryCard}>
            <div style={{ position: "relative" }}>
              <VisualCanonThumbnail seed={ch.illustrationSeed} />
              {"isMinted" in ch && !ch.isMinted && (
                <button
                  onClick={() => setDeleteTarget(ch.id)}
                  title="Delete chapter"
                  style={styles.deleteBtn}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <div style={styles.cardContent}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={styles.chapterNum}>CHAPTER 0{ch.number}</span>
                <span className="badge badge-purple" style={{ fontSize: "0.6rem" }}>CANON</span>
              </div>
              <h3 style={styles.cardTitle}>{ch.title}</h3>
              <p style={styles.cardText}>
                {ch.storyText.length > 100 ? `${ch.storyText.substring(0, 97)}...` : ch.storyText}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={styles.overlay} onClick={() => setDeleteTarget(null)}>
          <div className="glass-panel" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={{ color: "hsl(var(--foreground))", fontWeight: 600 }}>Delete Chapter</span>
              <button onClick={() => setDeleteTarget(null)} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "12px 0 20px" }}>
              This will permanently delete this chapter. Are you sure?
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteChapter(deleteTarget);
                  setDeleteTarget(null);
                }}
                style={styles.confirmBtn}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<div style={styles.emptyContainer}><span style={{color:"#fff"}}>Loading Gallery...</span></div>}>
      <GalleryContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "32px 40px",
    minHeight: "100%",
    flex: 1,
    width: "100%",
    background: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
    boxSizing: "border-box"
  },
  emptyContainer: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "hsl(var(--background))"
  },
  header: {
    borderBottom: "1px solid hsl(var(--border))",
    paddingBottom: "16px",
    zIndex: 10
  },
  title: {
    fontSize: "1.3rem",
    fontWeight: 700,
    margin: 0,
    color: "hsl(var(--foreground))"
  },
  subtitle: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginTop: "4px"
  },
  galleryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px",
    zIndex: 10
  },
  galleryCard: {
    borderRadius: "12px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    background: "var(--card-bg)",
    border: "1px solid hsl(var(--border))"
  },
  cardContent: {
    padding: "16px 20px"
  },
  chapterNum: {
    fontSize: "0.7rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-muted)",
    letterSpacing: "0.05em"
  },
  cardTitle: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "hsl(var(--foreground))",
    margin: "0 0 8px 0"
  },
  cardText: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
    margin: 0
  },
  deleteBtn: {
    position: "absolute",
    top: "6px",
    right: "6px",
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    border: "none",
    background: "rgba(255,60,60,0.12)",
    color: "#dc2626",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    zIndex: 5,
    backdropFilter: "blur(4px)",
    transition: "background 0.15s, color 0.15s",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(2px)",
  },
  modal: {
    padding: "24px",
    borderRadius: "12px",
    minWidth: "320px",
    background: "var(--card-bg)",
    border: "1px solid hsl(var(--border))",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
  },
  cancelBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  confirmBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    background: "rgba(239,68,68,0.15)",
    color: "#dc2626",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
  }
};
