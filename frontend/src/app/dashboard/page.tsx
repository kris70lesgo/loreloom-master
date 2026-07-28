"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStory } from "../../context/StoryContext";
import { SidebarSectionDividersDemo } from "../../components/SidebarSectionDividers";
import { 
  DotsHorizontal,
  Trash01
} from "@untitledui/icons";

export default function DashboardPage() {
  const router = useRouter();
  const { activeWorld, worlds, deleteWorld, switchWorld } = useStory();
  
  // Collapsible projects state
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("Featured");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [showLimitAlert, setShowLimitAlert] = useState(false);

  return (
    <div style={styles.dashboardContainer}>
      {/* 1px Blueprint Grid Anchoring the standard UI */}
      <div className="blueprint-grid" />

      {/* LEFT SIDEBAR WITH SECTION DIVIDERS */}
      <SidebarSectionDividersDemo />

      {/* RIGHT MAIN AREA - HOME DASHBOARD */}
      <div style={styles.mainArea}>
        
        {/* Top Navigation Row */}
        <div style={styles.mainTopNav}>
          <div style={styles.tabsContainer}>
            {["Featured", "Templates", "Playground"].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <div 
                  key={tab}
                  style={{
                    ...styles.tabLink,
                    color: isActive ? "var(--foreground)" : "var(--text-secondary)",
                    position: "relative",
                    zIndex: 1
                  }}
                  onClick={() => setActiveTab(tab)}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(255, 255, 255, 0.08)",
                        borderRadius: "100px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                        zIndex: -1
                      }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {tab}
                </div>
              );
            })}
          </div>
          
          <motion.button 
            whileHover={{ 
              scale: 1.02, 
              boxShadow: "0 4px 20px rgba(255, 85, 0, 0.4)",
            }}
            whileTap={{ scale: 0.98 }}
            style={{
              ...styles.newProjectBtn,
              position: "relative",
              overflow: "hidden"
            }}
            onClick={() => {
              if (worlds.length >= 2) {
                setShowLimitAlert(true);
              } else {
                router.push("/genesis");
              }
            }}
          >
            {/* Shimmer effect */}
            <motion.div
              style={{
                position: "absolute",
                top: 0, left: "-100%", width: "50%", height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
              }}
              animate={{ left: "150%" }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear", repeatDelay: 1 }}
            />
            <span style={{ position: "relative", zIndex: 2 }}>New project</span>
          </motion.button>
        </div>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.12
              }
            }
          }}
          style={styles.scrollableContent}
        >
          
          {/* Recently Viewed Section */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } }
            }}
            style={styles.sectionContainer}
          >
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Recently viewed</h2>
              <span style={styles.viewAllLink}>View all</span>
            </div>
            
            {!worlds || worlds.length === 0 ? (
              <div style={{ 
                color: "var(--text-secondary)", 
                fontFamily: "var(--font-inter)", 
                fontSize: "0.8rem", 
                padding: "24px 20px",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px dashed rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                marginTop: "12px"
              }}>
                No recent projects found
              </div>
            ) : (
            <div style={styles.recentGrid}>
              {worlds.slice(0, 2).map((world) => (
                <motion.div 
                  key={world.id} 
                  whileHover={{ 
                    scale: 1.02,
                    y: -4
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  onClick={() => {
                    switchWorld(world.id);
                    router.push(`/workspace?worldId=${world.id}`);
                  }}
                  style={{
                    ...styles.recentCard, 
                    position: "relative",
                    background: "rgba(255, 255, 255, 0.01)",
                    border: "1px solid rgba(255, 255, 255, 0.03)",
                    borderRadius: "16px",
                    padding: "16px",
                    transition: "border-color 0.2s, box-shadow 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(176,38,255,0.25)";
                    e.currentTarget.style.boxShadow = "0 8px 30px rgba(176,38,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.03)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={styles.recentThumbnail}>
                    {/* Placeholder for project thumbnail mosaic */}
                    <div style={styles.thumbnailMosaic}>
                      <div style={{...styles.mosaicPiece, background: "rgba(176,38,255,0.2)"}}></div>
                      <div style={{...styles.mosaicPiece, background: "rgba(0,214,255,0.2)"}}></div>
                      <div style={{...styles.mosaicPiece, background: "rgba(255,215,0,0.2)"}}></div>
                      <div style={{...styles.mosaicPiece, background: "rgba(255,255,255,0.05)"}}></div>
                    </div>
                  </div>
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%"}}>
                    <div style={styles.recentInfo}>
                      <h3 style={styles.recentProjectName}>{world.name}</h3>
                      <p style={styles.recentProjectMeta}>Kaito-X · Created {world.createdAt.split('T')[0]}</p>
                    </div>
                    <div style={{position: "relative"}}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === world.id ? null : world.id);
                        }} 
                        style={{background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px"}}
                      >
                        <DotsHorizontal size={20} />
                      </button>
                      
                      <AnimatePresence>
                        {openMenuId === world.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            style={{
                              position: "absolute",
                              top: "100%",
                              right: 0,
                              background: "var(--card-bg)",
                              backdropFilter: "blur(10px)",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              padding: "4px",
                              minWidth: "140px",
                              zIndex: 10,
                              boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
                            }}
                          >
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setProjectToDelete(world.id);
                                  setOpenMenuId(null);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                width: "100%",
                                padding: "10px 12px",
                                background: "transparent",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                fontFamily: "var(--font-inter)",
                                textAlign: "left",
                                borderRadius: "4px",
                                transition: "background 0.2s"
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <Trash01 size={16} />
                              Delete Project
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            )}
          </motion.div>

        </motion.div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {projectToDelete && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                background: "var(--card-bg)",
                border: "1px solid hsl(var(--border))",
                borderRadius: "16px",
                padding: "32px",
                maxWidth: "400px",
                width: "100%",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                textAlign: "center"
              }}
            >
              <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "16px", fontFamily: "var(--font-sans)", color: "hsl(var(--foreground))" }}>Delete Project?</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "32px", lineHeight: 1.5 }}>
                Are you sure you want to delete this project? This action cannot be undone and all canonical data will be lost.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button 
                  onClick={() => setProjectToDelete(null)}
                  style={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    padding: "10px 24px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontFamily: "var(--font-inter)",
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    deleteWorld(projectToDelete);
                    setProjectToDelete(null);
                  }}
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#dc2626",
                    padding: "10px 24px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontFamily: "var(--font-inter)",
                    fontWeight: 600
                  }}
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Project Limit Alert Modal */}
      <AnimatePresence>
        {showLimitAlert && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                background: "var(--card-bg)",
                border: "1px solid hsl(var(--border))",
                borderRadius: "16px",
                padding: "32px",
                maxWidth: "400px",
                width: "100%",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                textAlign: "center"
              }}
            >
              <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "16px", fontFamily: "var(--font-sans)", color: "var(--accent-orange)" }}>Upgrade to Pro</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "32px", lineHeight: 1.5 }}>
                Free tier allows a maximum of 2 active projects. Upgrade to Pro for unlimited access.
              </p>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button 
                  onClick={() => setShowLimitAlert(false)}
                  style={{
                    background: "var(--accent-orange)",
                    border: "none",
                    color: "#fff",
                    padding: "10px 32px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontFamily: "var(--font-inter)",
                    fontWeight: 500
                  }}
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  dashboardContainer: {
    display: "flex",
    height: "100vh",
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  sidebar: {
    width: "240px",
    flexShrink: 0,
    background: "rgba(10, 10, 12, 0.6)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRight: "1px solid rgba(255,255,255,0.04)",
    display: "flex",
    flexDirection: "column",
    padding: "24px 0",
    zIndex: 20,
  },
  profileSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 24px 24px 24px",
    cursor: "pointer",
  },
  avatar: {
    width: "32px",
    height: "32px",
    background: "linear-gradient(135deg, rgba(176,38,255,0.4), rgba(0,214,255,0.4))",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-inter)",
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "#fff",
  },
  profileInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  profileName: {
    fontFamily: "var(--font-inter)",
    fontWeight: 500,
    fontSize: "0.85rem",
    color: "var(--foreground)",
  },
  profileStatus: {
    fontFamily: "var(--font-inter)",
    fontSize: "0.7rem",
    color: "var(--text-muted)",
  },
  navSection: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "0 12px",
  },
  sidebarLink: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    fontFamily: "var(--font-inter)",
    fontSize: "0.85rem",
    fontWeight: 400,
    color: "var(--text-secondary)",
    borderRadius: "6px",
    transition: "background 0.2s, color 0.2s",
    cursor: "pointer",
  },
  sidebarLinkActive: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    fontFamily: "var(--font-inter)",
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "var(--foreground)",
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    borderRadius: "6px",
    cursor: "pointer",
  },
  sidebarLinkClickable: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    fontFamily: "var(--font-inter)",
    fontSize: "0.85rem",
    fontWeight: 400,
    color: "var(--text-secondary)",
    cursor: "pointer",
    borderRadius: "6px",
    transition: "background 0.2s",
  },
  collapsibleContainer: {
    display: "flex",
    flexDirection: "column",
  },
  projectList: {
    display: "flex",
    flexDirection: "column",
    paddingLeft: "32px",
    marginTop: "4px",
    overflow: "hidden",
  },
  projectItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 0",
    fontFamily: "var(--font-inter)",
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    cursor: "pointer",
  },
  projectIndicatorActive: {
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    background: "var(--accent-purple)",
    boxShadow: "0 0 6px var(--accent-purple)",
  },
  antiGravityCard: {
    margin: "0 24px",
    background: "rgba(0, 214, 255, 0.05)",
    border: "1px solid rgba(0, 214, 255, 0.15)",
    borderRadius: "6px",
    padding: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    fontFamily: "var(--font-inter)",
    fontSize: "0.75rem",
    color: "var(--accent-cyan)",
    fontWeight: 600,
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  settingsSection: {
    padding: "24px",
    display: "flex",
    alignItems: "center",
  },
  mainArea: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    position: "relative",
    zIndex: 10,
    background: "var(--background)",
    overflowY: "auto",
    height: "100vh",
  },
  mainTopNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 48px",
    borderBottom: "1px solid var(--border)",
  },
  tabsContainer: {
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.03)",
    padding: "4px",
    borderRadius: "100px",
  },
  tabLink: {
    padding: "8px 24px",
    fontFamily: "var(--font-inter)",
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    cursor: "pointer",
    borderRadius: "100px",
    transition: "all 0.2s",
  },
  tabLinkActive: {
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
  },
  newProjectBtn: {
    background: "var(--accent-orange, #FF5500)", // Using a custom brand color similar to reference
    border: "none",
    color: "#fff",
    padding: "10px 24px",
    borderRadius: "8px",
    fontFamily: "var(--font-inter)",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.2s",
    boxShadow: "0 4px 15px rgba(255, 85, 0, 0.3)",
  },
  scrollableContent: {
    flex: 1,
    overflowY: "auto",
    padding: "48px",
    display: "flex",
    flexDirection: "column",
    gap: "48px",
    willChange: "transform",
    transform: "translateZ(0)",
    WebkitBackfaceVisibility: "hidden",
    backfaceVisibility: "hidden",
  },
  sectionContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: "var(--font-inter)",
    fontWeight: 600,
    fontSize: "1.2rem",
    color: "var(--foreground)",
  },
  viewAllLink: {
    fontFamily: "var(--font-inter)",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    cursor: "pointer",
    border: "1px solid var(--border)",
    padding: "6px 16px",
    borderRadius: "100px",
    transition: "background 0.2s",
  },
  recentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "24px",
    maxWidth: "1100px",
    width: "100%",
  },
  recentCard: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  recentThumbnail: {
    height: "140px",
    background: "var(--card-bg)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailMosaic: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows: "1fr 1fr",
    gap: "4px",
    width: "100%",
    height: "100%",
    padding: "4px",
  },
  mosaicPiece: {
    borderRadius: "8px",
  },
  recentInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  recentProjectName: {
    fontFamily: "var(--font-inter)",
    fontWeight: 500,
    fontSize: "0.9rem",
    color: "var(--foreground)",
  },
  recentProjectMeta: {
    fontFamily: "var(--font-inter)",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  modelsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    maxWidth: "1100px",
    width: "100%",
  },
  modelCardLarge: {
    height: "220px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.05)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    cursor: "pointer",
    overflow: "hidden",
  },
  modelsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px",
  },
  modelCardSmall: {
    height: "140px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.05)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    cursor: "pointer",
  },
  modelIconBadge: {
    width: "28px",
    height: "28px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
  },
  modelContent: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  modelNameLarge: {
    fontFamily: "var(--font-inter)",
    fontWeight: 600,
    fontSize: "1.4rem",
    color: "#fff",
  },
  modelName: {
    fontFamily: "var(--font-inter)",
    fontWeight: 600,
    fontSize: "1.1rem",
    color: "#fff",
  },
  modelDesc: {
    fontFamily: "var(--font-inter)",
    fontSize: "0.9rem",
    color: "rgba(255,255,255,0.7)",
  },
  modelDescSmall: {
    fontFamily: "var(--font-inter)",
    fontSize: "0.8rem",
    color: "rgba(255,255,255,0.7)",
  },
  modelSpecs: {
    display: "inline-flex",
    alignItems: "center",
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    marginTop: "8px",
  },
  modelHoverAction: {
    position: "absolute",
    right: "24px",
    bottom: "24px",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    backdropFilter: "blur(10px)",
  }
};
