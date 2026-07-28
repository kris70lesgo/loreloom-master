"use client";

import React, { useState, Suspense } from "react";
import { useStory } from "../../../context/StoryContext";
import { useWorldStore } from "../../../store/useWorldStore";
import { Share2 as LucideShare2 } from "lucide-react";
import { BookOpen01 as BookOpen, LinkExternal01 as ExternalLink, Link01 as LinkIcon, Check } from "@untitledui/icons";

function ShareableContent() {
  const { activeWorld } = useStory();
  const heroName = useWorldStore((s) => s.heroName);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!activeWorld) {
    return (
      <div style={styles.emptyContainer}>
        <span style={{ color: "var(--text-secondary)" }}>No Active World Loaded</span>
      </div>
    );
  }

  const handleGenerateLink = () => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/preview/${activeWorld.id}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div style={styles.container}>
      <div className="blueprint-grid" />
      
      {/* Export Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <LucideShare2 size={24} style={{ color: "var(--accent-purple)", flexShrink: 0 }} />
          <h1 className="title-cyber" style={styles.title}>SHAREABLE CANON PREVIEW</h1>
        </div>
        
        <button 
          onClick={handleGenerateLink} 
          style={{
            ...styles.shareBtn,
            background: copiedLink ? "#22c55e" : "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
            boxShadow: copiedLink ? "0 0 15px rgba(34, 197, 94, 0.3)" : "0 4px 15px rgba(176, 38, 255, 0.2)"
          }}
        >
          {copiedLink ? <Check size={14} /> : <LinkIcon size={14} />}
          <span>{copiedLink ? "Link Copied!" : "Generate Share Link"}</span>
        </button>
      </div>

      {/* Centralized constrained preview block */}
      <div style={styles.previewContainer}>
        <div className="glass-panel" style={styles.previewPaper}>
          <div style={styles.paperHeader}>
            <span style={styles.paperMeta}>CANON PREVIEW // WORLD: {activeWorld.name.toUpperCase()}</span>
            <div style={styles.divider} />
          </div>

          <h2 style={styles.paperTitle}>{activeWorld.name}</h2>
          <p style={styles.paperPremise}>&ldquo;{activeWorld.premise}&rdquo;</p>
          
          <div style={styles.metadataGrid}>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>ART DIRECTOR</span>
              <span style={styles.metaVal}>{activeWorld.style}</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>PROTAGONIST</span>
              <span style={styles.metaVal}>{heroName || activeWorld.protagonistName}</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>CORE RELIC</span>
              <span style={styles.metaVal}>{activeWorld.relicName}</span>
            </div>
          </div>

          <div style={styles.divider} />

          {/* Chapters Rendered top-to-bottom */}
          <div style={styles.chaptersFlow}>
            {activeWorld.chapters.map((ch) => (
              <div key={ch.id} style={styles.chapterSection}>
                <h3 style={styles.chHeader}>Chapter {ch.number}: {ch.title}</h3>
                <p style={styles.chText}>{ch.storyText}</p>
              </div>
            ))}
            {activeWorld.chapters.length === 0 && (
              <p style={{ color: "var(--text-muted)", textAlign: "center", fontStyle: "italic", padding: "40px 0" }}>
                No narrative beats have been synthesized in this canon yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShareablePage() {
  return (
    <Suspense fallback={<div style={styles.emptyContainer}><span style={{color:"#fff"}}>Loading Export Preview...</span></div>}>
      <ShareableContent />
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid hsl(var(--border))",
    paddingBottom: "16px",
    zIndex: 10,
    gap: "20px"
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  title: {
    fontSize: "1.3rem",
    fontWeight: 700,
    margin: 0,
    color: "hsl(var(--foreground))"
  },
  shareBtn: {
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    padding: "10px 20px",
    fontSize: "0.85rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  previewContainer: {
    display: "flex",
    justifyContent: "center",
    zIndex: 10
  },
  previewPaper: {
    width: "100%",
    maxWidth: "760px", // Constrained-width container sitting in middle
    background: "hsl(var(--background))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "16px",
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    boxSizing: "border-box",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)"
  },
  paperHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  paperMeta: {
    fontSize: "0.7rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-muted)",
    letterSpacing: "0.08em"
  },
  divider: {
    height: "1px",
    background: "hsl(var(--border))"
  },
  paperTitle: {
    fontSize: "1.8rem",
    fontWeight: 800,
    fontFamily: "var(--font-sans)",
    color: "hsl(var(--foreground))",
    margin: 0
  },
  paperPremise: {
    fontSize: "0.95rem",
    fontStyle: "italic",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.5
  },
  metadataGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "16px",
    background: "var(--card-bg)",
    border: "1px solid hsl(var(--border))",
    borderRadius: "10px",
    padding: "16px"
  },
  metaItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  metaLabel: {
    fontSize: "0.65rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-muted)",
    letterSpacing: "0.05em"
  },
  metaVal: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "hsl(var(--foreground))"
  },
  chaptersFlow: {
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    marginTop: "16px"
  },
  chapterSection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  chHeader: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "hsl(var(--foreground))",
    margin: 0
  },
  chText: {
    fontSize: "0.92rem",
    color: "hsl(var(--foreground))",
    lineHeight: 1.8,
    margin: 0,
    textAlign: "justify"
  }
};
