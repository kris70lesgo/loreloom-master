"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Home01,
  LayoutGrid01,
  Folder,
  Settings01,
  HelpCircle,
  LinkExternal01,
  ChevronDown,
  ChevronRight,
  LayoutLeft,
  Stars01,
  LayersThree01,
  LogOut01,
  DotsVertical,
  LayoutAlt02
} from "@untitledui/icons";
import { useStory } from "../context/StoryContext";

export interface NavSubItem {
  label: string;
  badge?: number | string;
  href: string;
}

export interface NavItemType {
  label: string;
  href?: string;
  icon?: React.ElementType;
  badge?: React.ReactNode;
  items?: NavSubItem[];
  divider?: false;
}

export interface NavItemDividerType {
  divider: true;
}

export type NavItem = NavItemType | NavItemDividerType;

export function SidebarSectionDividersDemo() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeWorld, worlds } = useStory();
  const { theme, setTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    "Projects & Worlds": true
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const metadataAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
        if (metadataAvatar) {
          setAvatarUrl(metadataAvatar);
        } else if (user.email) {
          try {
            const cleanEmail = user.email.trim().toLowerCase();
            const msgBuffer = new TextEncoder().encode(cleanEmail);
            const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
            setAvatarUrl(`https://www.gravatar.com/avatar/${hashHex}?d=identicon`);
          } catch (e) {
            console.error("Error generating gravatar:", e);
            setAvatarUrl(`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email)}`);
          }
        }
      }
    });
  }, []);

  const displayName = user?.user_metadata?.full_name || 
    (user?.email ? user.email.split('@')[0].split(/[._-]/).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') : "User");

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isWorkspace = pathname?.startsWith("/workspace");

  const itemColors: Record<string, { active: string; hover: string; glow: string }> = {
    "Home": { active: "#FF9800", hover: "#FFB74D", glow: "rgba(255, 152, 0, 0.08)" },
    "Dashboard": { active: "#00D6FF", hover: "#33E0FF", glow: "rgba(0, 214, 255, 0.08)" },
    "Genesis Engine": { active: "#B026FF", hover: "#C55BFF", glow: "rgba(176, 38, 255, 0.08)" },
    "Workspace": { active: "#00E676", hover: "#33F091", glow: "rgba(0, 230, 118, 0.08)" },
    "Story Archives": { active: "#FFD700", hover: "#FFE033", glow: "rgba(255, 215, 0, 0.08)" },
    "On-Chain Provenance": { active: "#EC4899", hover: "#F472B6", glow: "rgba(236, 72, 153, 0.08)" },
    "Support & Docs": { active: "#FF5722", hover: "#FF7A50", glow: "rgba(255, 87, 34, 0.08)" },
    "OKX X Layer Faucet": { active: "#8E24AA", hover: "#AB47BC", glow: "rgba(142, 36, 170, 0.08)" },
    "Projects & Worlds": { active: "#FFEB3B", hover: "#FFF176", glow: "rgba(255, 235, 59, 0.08)" }
  };

  const navItems: NavItem[] = [
    {
      label: "Home",
      href: "/",
      icon: Home01,
    },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutGrid01,
    },
    {
      label: "Genesis Engine",
      href: "/genesis",
      icon: Stars01,
      badge: (
        <span style={styles.badgeSuccess}>
          Active
        </span>
      ),
    },
    { divider: true },
    {
      label: "Projects & Worlds",
      icon: Folder,
      items: [
        { 
          label: activeWorld?.name ? activeWorld.name : "Genesis Intake", 
          href: "/genesis", 
          badge: worlds.length 
        },
      ],
    },
    ...(isWorkspace
      ? [
          { divider: true as const },
          {
            label: "Workspace",
            href: activeWorld?.id ? `/workspace?worldId=${activeWorld.id}` : "/workspace",
            icon: LayoutAlt02,
          },
          {
            label: "Story Archives",
            href: "/workspace/gallery",
            icon: LayersThree01,
          },
          {
            label: "On-Chain Provenance",
            href: activeWorld?.id ? `/workspace/provenance?worldId=${activeWorld.id}` : "/workspace/provenance",
            icon: Stars01,
          },
          {
            label: "Support & Docs",
            href: "/workspace/shareable",
            icon: HelpCircle,
            badge: (
              <span style={styles.badgeOnline}>
                <span style={styles.badgeDot} />
                Online
              </span>
            ),
          },
          {
            label: "OKX X Layer Faucet",
            href: "https://www.okx.com/xlayer",
            icon: LinkExternal01,
          },
        ]
      : []),
  ];

  return (
    <motion.aside
      animate={{ width: isSidebarOpen ? 260 : 70 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={styles.aside}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .sidebar-nav-link {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .sidebar-nav-link:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        .sidebar-nav-link:hover svg {
          filter: drop-shadow(0 0 5px currentColor);
        }
        .sidebar-logo-glow {
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.15));
          animation: logo-pulse 4s ease-in-out infinite alternate;
        }
        @keyframes logo-pulse {
          0% { filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.1)); }
          100% { filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.25)); }
        }
      `}} />
      {/* Top Header & Collapse Toggle */}
      <div style={isSidebarOpen ? styles.topHeader : styles.topHeaderCollapsed}>
        {isSidebarOpen ? (
          <>
            <Link href="/" style={styles.logoGroup}>
              <svg className="sidebar-logo-glow" width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <g filter="url(#sidebar_logo_filter0)">
                  <g clipPath="url(#sidebar_logo_clip0)">
                    <rect width="48" height="48" rx="12" fill="#0A0A0A"/>
                    <rect width="48" height="48" fill="url(#sidebar_logo_paint0)"/>
                    <g filter="url(#sidebar_logo_filter1)">
                      <path d="M9 12.75C9 10.6789 10.6789 9 12.75 9H20.25C22.3211 9 24 10.6789 24 12.75V20.1144C24.0002 20.1594 24.0003 20.2046 24.0003 20.25C24.0003 22.3181 25.6744 23.9952 27.7413 24C27.7442 24 27.7471 24 27.75 24H35.25C37.3211 24 39 25.6789 39 27.75V35.25C39 37.3211 37.3211 39 35.25 39H27.75C25.6789 39 24 37.3211 24 35.25V27.75C24 27.7396 24 27.7292 24.0001 27.7188C23.9834 25.6621 22.3109 24 20.2503 24C20.2406 24 20.2309 24 20.2212 24H12.75C10.6789 24 9 22.3211 9 20.25V12.75Z" fill="url(#sidebar_logo_paint1)"/>
                    </g>
                  </g>
                  <rect x="1" y="1" width="46" height="46" rx="11" stroke="url(#sidebar_logo_paint2)" strokeWidth="2"/>
                </g>
                <defs>
                  <filter id="sidebar_logo_filter0" x="0" y="-3" width="48" height="54" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="-3"/>
                    <feGaussianBlur stdDeviation="1.5"/>
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
                    <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="3"/>
                    <feGaussianBlur stdDeviation="1.5"/>
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.1 0"/>
                    <feBlend mode="normal" in2="effect1_innerShadow" result="effect2_innerShadow"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feMorphology radius="1" operator="erode" in="SourceAlpha" result="effect3_innerShadow"/>
                    <feOffset/>
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
                    <feBlend mode="normal" in2="effect2_innerShadow" result="effect3_innerShadow"/>
                  </filter>
                  <filter id="sidebar_logo_filter1" x="6" y="5.25" width="36" height="42" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feMorphology radius="1.5" operator="erode" in="SourceAlpha" result="effect1_dropShadow"/>
                    <feOffset dy="2.25"/>
                    <feGaussianBlur stdDeviation="2.25"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0.1 0"/>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
                  </filter>
                  <linearGradient id="sidebar_logo_paint0" x1="24" y1="0" x2="26" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white" stopOpacity="0"/>
                    <stop offset="1" stopColor="white" stopOpacity="0.12"/>
                  </linearGradient>
                  <linearGradient id="sidebar_logo_paint1" x1="24" y1="9" x2="24" y2="39" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white" stopOpacity="0.8"/>
                    <stop offset="1" stopColor="white" stopOpacity="0.5"/>
                  </linearGradient>
                  <linearGradient id="sidebar_logo_paint2" x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white" stopOpacity="0.12"/>
                    <stop offset="1" stopColor="white" stopOpacity="0"/>
                  </linearGradient>
                  <clipPath id="sidebar_logo_clip0">
                    <rect width="48" height="48" rx="12" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
              <span style={styles.logoText}>Loreloom</span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              style={styles.toggleBtn}
              title="Collapse sidebar"
            >
              <LayoutLeft size={18} />
            </button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px", width: "100%" }}>
            <Link href="/" style={{ display: "flex", justifyContent: "center" }}>
              <svg className="sidebar-logo-glow" width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g filter="url(#sidebar_logo_collapsed_filter0)">
                  <g clipPath="url(#sidebar_logo_collapsed_clip0)">
                    <rect width="48" height="48" rx="12" fill="#0A0A0A"/>
                    <rect width="48" height="48" fill="url(#sidebar_logo_collapsed_paint0)"/>
                    <g filter="url(#sidebar_logo_collapsed_filter1)">
                      <path d="M9 12.75C9 10.6789 10.6789 9 12.75 9H20.25C22.3211 9 24 10.6789 24 12.75V20.1144C24.0002 20.1594 24.0003 20.2046 24.0003 20.25C24.0003 22.3181 25.6744 23.9952 27.7413 24C27.7442 24 27.7471 24 27.75 24H35.25C37.3211 24 39 25.6789 39 27.75V35.25C39 37.3211 37.3211 39 35.25 39H27.75C25.6789 39 24 37.3211 24 35.25V27.75C24 27.7396 24 27.7292 24.0001 27.7188C23.9834 25.6621 22.3109 24 20.2503 24C20.2406 24 20.2309 24 20.2212 24H12.75C10.6789 24 9 22.3211 9 20.25V12.75Z" fill="url(#sidebar_logo_collapsed_paint1)"/>
                    </g>
                  </g>
                  <rect x="1" y="1" width="46" height="46" rx="11" stroke="url(#sidebar_logo_collapsed_paint2)" strokeWidth="2"/>
                </g>
                <defs>
                  <filter id="sidebar_logo_collapsed_filter0" x="0" y="-3" width="48" height="54" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="-3"/>
                    <feGaussianBlur stdDeviation="1.5"/>
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
                    <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="3"/>
                    <feGaussianBlur stdDeviation="1.5"/>
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.1 0"/>
                    <feBlend mode="normal" in2="effect1_innerShadow" result="effect2_innerShadow"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feMorphology radius="1" operator="erode" in="SourceAlpha" result="effect3_innerShadow"/>
                    <feOffset/>
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
                    <feBlend mode="normal" in2="effect2_innerShadow" result="effect3_innerShadow"/>
                  </filter>
                  <filter id="sidebar_logo_collapsed_filter1" x="6" y="5.25" width="36" height="42" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feMorphology radius="1.5" operator="erode" in="SourceAlpha" result="effect1_dropShadow"/>
                    <feOffset dy="2.25"/>
                    <feGaussianBlur stdDeviation="2.25"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0.1 0"/>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
                  </filter>
                  <linearGradient id="sidebar_logo_collapsed_paint0" x1="24" y1="0" x2="26" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white" stopOpacity="0"/>
                    <stop offset="1" stopColor="white" stopOpacity="0.12"/>
                  </linearGradient>
                  <linearGradient id="sidebar_logo_collapsed_paint1" x1="24" y1="9" x2="24" y2="39" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white" stopOpacity="0.8"/>
                    <stop offset="1" stopColor="white" stopOpacity="0.5"/>
                  </linearGradient>
                  <linearGradient id="sidebar_logo_collapsed_paint2" x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white" stopOpacity="0.12"/>
                    <stop offset="1" stopColor="white" stopOpacity="0"/>
                  </linearGradient>
                  <clipPath id="sidebar_logo_collapsed_clip0">
                    <rect width="48" height="48" rx="12" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                transition: "background 0.2s, color 0.2s"
              }}
              title="Expand sidebar"
              onMouseOver={(e) => {
                e.currentTarget.style.background = "hsl(var(--border))";
                e.currentTarget.style.color = "hsl(var(--foreground))";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <LayoutLeft size={18} style={{ transform: "rotate(180deg)" }} />
            </button>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div style={{ ...styles.navScrollContainer, padding: isSidebarOpen ? "8px 12px" : "4px 6px" }}>
        {navItems.map((item, idx) => {
          if (item.divider) {
            return (
              <div
                key={`divider-${idx}`}
                style={styles.divider}
              />
            );
          }

          const Icon = item.icon;
          const isActive = item.href ? pathname === item.href.split("?")[0] : false;
          const hasItems = Array.isArray(item.items) && item.items.length > 0;
          const isSubOpen = openSubmenus[item.label] ?? false;
          const colors = itemColors[item.label] || { active: "#B026FF", hover: "rgba(255, 255, 255, 0.05)", glow: "rgba(176, 38, 255, 0.08)" };

          return (
            <div key={item.label} style={styles.navItemWrapper}>
              {hasItems ? (
                <div>
                  <button
                    onClick={() => {
                      if (!isSidebarOpen) setIsSidebarOpen(true);
                      toggleSubmenu(item.label);
                    }}
                    style={{
                      ...styles.navButton,
                      padding: isSidebarOpen ? "10px 12px" : "10px 0",
                      justifyContent: isSidebarOpen ? "space-between" : "center",
                    }}
                  >
                    <div style={styles.navLabelGroup}>
                      {Icon && <Icon size={18} style={styles.iconMuted} />}
                      {isSidebarOpen && <span style={styles.navText}>{item.label}</span>}
                    </div>
                    {isSidebarOpen && (
                      isSubOpen ? (
                        <ChevronDown size={14} style={styles.iconMuted} />
                      ) : (
                        <ChevronRight size={14} style={styles.iconMuted} />
                      )
                    )}
                  </button>

                  <AnimatePresence>
                    {isSubOpen && isSidebarOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={styles.subMenuContainer}
                      >
                        {item.items?.map((sub) => (
                          <Link
                            key={sub.label}
                            href={sub.href}
                            style={{
                              ...styles.subNavLink,
                              color: pathname === sub.href ? "hsl(var(--foreground))" : "var(--text-secondary)",
                              fontWeight: pathname === sub.href ? 600 : 400,
                            }}
                          >
                            <span style={styles.subLabelText}>{sub.label}</span>
                            {sub.badge !== undefined && (
                              <span style={styles.subBadge}>{sub.badge}</span>
                            )}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : item.href?.startsWith("http") ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...styles.navLink,
                    padding: isSidebarOpen ? "10px 12px" : "10px 0",
                    justifyContent: isSidebarOpen ? "space-between" : "center",
                  }}
                >
                  <div style={styles.navLabelGroup}>
                    {Icon && <Icon size={18} style={styles.iconMuted} />}
                    {isSidebarOpen && <span style={styles.navText}>{item.label}</span>}
                  </div>
                </a>
              ) : (
                <Link
                  href={item.href || "#"}
                  className="sidebar-nav-link"
                  style={{
                    ...styles.navLink,
                    padding: isSidebarOpen ? "10px 12px" : "10px 0",
                    justifyContent: isSidebarOpen ? "space-between" : "center",
                    position: "relative",
                    background: isActive ? (colors.glow || "rgba(255,255,255,0.03)") : "transparent",
                    border: isActive ? `1px solid ${colors.active}30` : "1px solid transparent",
                    boxShadow: isActive ? `0 0 15px ${colors.glow}` : "none",
                    borderRadius: "8px",
                  }}
                >
                  {isActive && (
                    <div 
                      style={{
                        position: "absolute",
                        left: isSidebarOpen ? "-4px" : "2px",
                        width: "3px",
                        height: "18px",
                        background: colors.active,
                        borderRadius: "0 4px 4px 0",
                        boxShadow: `0 0 10px ${colors.active}`
                      }} 
                    />
                  )}
                  <div style={styles.navLabelGroup}>
                    {Icon && (
                      <Icon
                        size={18}
                        style={{
                          color: isActive ? colors.active : "var(--text-muted)",
                          flexShrink: 0,
                          transition: "all 0.2s ease",
                          filter: isActive ? `drop-shadow(0 0 4px ${colors.active}50)` : "none"
                        }}
                      />
                    )}
                    {isSidebarOpen && (
                      <span
                        style={{
                          ...styles.navText,
                          color: isActive ? "hsl(var(--foreground))" : "var(--text-secondary)",
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                  </div>
                  {isSidebarOpen && item.badge && <div>{item.badge}</div>}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer User Profile */}
      <div style={{ 
        ...styles.footerProfile, 
        margin: isSidebarOpen ? "12px" : "12px 6px",
        padding: isSidebarOpen ? "12px" : "12px 6px",
        flexDirection: "column", 
        alignItems: "stretch", 
        gap: "12px", 
        position: "relative" 
      }}>
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
            {avatarUrl ? (
              <Image 
                src={avatarUrl} 
                alt={displayName} 
                width={32}
                height={32}
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  flexShrink: 0
                }}
              />
            ) : (
              <div style={styles.avatar}>
                {displayName.charAt(0)}
              </div>
            )}
            {isSidebarOpen && (
              <div style={styles.profileTextGroup}>
                <div style={styles.profileName}>
                  {displayName}
                </div>
                <div style={styles.profileSub}>
                  {user?.email || "loading..."}
                </div>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <button 
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              style={{
                background: "transparent",
                border: "none",
                color: profileMenuOpen ? "hsl(var(--foreground))" : "var(--text-secondary)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.2s"
              }}
              onMouseOver={(e) => {
                if (!profileMenuOpen) e.currentTarget.style.color = "hsl(var(--foreground))";
              }}
              onMouseOut={(e) => {
                if (!profileMenuOpen) e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <DotsVertical size={18} />
            </button>
          )}
        </div>

        {/* Profile Dropdown Menu */}
        <AnimatePresence>
          {profileMenuOpen && isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "12px",
                right: "12px",
                background: "var(--card-bg)",
                backdropFilter: "blur(10px)",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                padding: "4px",
                zIndex: 50,
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                display: "flex",
                flexDirection: "column",
                gap: "2px"
              }}
            >
              <Link 
                href="/dashboard/settings"
                onClick={() => setProfileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-inter)",
                  textAlign: "left",
                  borderRadius: "6px",
                  transition: "background 0.2s, color 0.2s",
                  textDecoration: "none",
                  boxSizing: "border-box"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "hsl(var(--border))";
                  e.currentTarget.style.color = "hsl(var(--foreground))";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <Settings01 size={14} />
                <span>Settings</span>
              </Link>

              {mounted && (
                <button 
                  onClick={() => {
                    setTheme(theme === "dark" ? "light" : "dark");
                    setProfileMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-inter)",
                    textAlign: "left",
                    borderRadius: "6px",
                    transition: "background 0.2s, color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "hsl(var(--border))";
                    e.currentTarget.style.color = "hsl(var(--foreground))";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>
              )}

              <button 
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  router.push("/login");
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
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-inter)",
                  textAlign: "left",
                  borderRadius: "6px",
                  transition: "background 0.2s",
                  boxSizing: "border-box"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "hsl(var(--border))"}
                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
              >
                <LogOut01 size={14} />
                <span>Log out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  aside: {
    height: "100vh",
    position: "sticky",
    top: 0,
    background: "hsl(var(--background))",
    borderRight: "1px solid hsl(var(--border))",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    flexShrink: 0,
    zIndex: 40,
    userSelect: "none",
  },
  bottomProfile: {
    padding: "16px",
    borderTop: "1px solid hsl(var(--border))",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  collapsedProfileContainer: {
    padding: "16px 8px",
    borderTop: "1px solid hsl(var(--border))",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  profileBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    flex: 1,
    cursor: "pointer",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  topHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 20px 16px 20px",
    height: "64px",
  },
  topHeaderCollapsed: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px 10px 0px 10px",
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    textDecoration: "none",
  },
  logoText: {
    fontFamily: "var(--font-sans)",
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "hsl(var(--foreground))",
    letterSpacing: "-0.02em",
  },
  logoDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "var(--accent-purple)",
    boxShadow: "0 0 8px var(--accent-purple)",
  },
  logoDotOnly: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "var(--accent-purple)",
    boxShadow: "0 0 10px var(--accent-purple)",
    margin: "0 auto",
  },
  toggleBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    transition: "color 0.2s",
  },
  navScrollContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  divider: {
    height: "1px",
    background: "hsl(var(--border))",
    margin: "8px 4px",
  },
  navItemWrapper: {
    display: "flex",
    flexDirection: "column",
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "8px",
    textDecoration: "none",
    transition: "all 0.15s ease",
  },
  navLinkActive: {
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    color: "hsl(var(--foreground))",
  },
  navItemInactive: {
    background: "transparent",
    color: "var(--text-secondary)",
  },
  navButton: {
    width: "100%",
    background: "transparent",
    border: "none",
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  navLabelGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
  },
  navText: {
    fontSize: "0.875rem",
    fontFamily: "var(--font-sans)",
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
  },
  iconMuted: {
    color: "var(--text-muted)",
    flexShrink: 0,
  },
  iconActive: {
    color: "var(--accent-purple)",
    flexShrink: 0,
  },
  subMenuContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    paddingLeft: "32px",
    marginTop: "2px",
    marginBottom: "4px",
  },
  subNavLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 10px",
    borderRadius: "6px",
    textDecoration: "none",
    fontSize: "0.8rem",
    fontFamily: "var(--font-sans)",
  },
  subLabelText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  subBadge: {
    background: "rgba(255, 255, 255, 0.08)",
    color: "var(--text-muted)",
    borderRadius: "100px",
    padding: "2px 8px",
    fontSize: "0.7rem",
    fontFamily: "var(--font-mono)",
  },
  badgeSuccess: {
    background: "rgba(34, 197, 94, 0.12)",
    color: "#4ade80",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    borderRadius: "100px",
    padding: "2px 8px",
    fontSize: "0.7rem",
    fontWeight: 600,
  },
  badgeOnline: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(34, 197, 94, 0.1)",
    color: "#4ade80",
    borderRadius: "100px",
    padding: "2px 8px",
    fontSize: "0.7rem",
    fontWeight: 500,
  },
  badgeDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#4ade80",
  },
  footerProfile: {
    margin: "12px",
    padding: "12px",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 0 10px rgba(176, 38, 255, 0.2)",
  },
  profileTextGroup: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  profileName: {
    fontSize: "0.85rem",
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    color: "hsl(var(--foreground))",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  profileSub: {
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    background: "rgba(239, 68, 68, 0.05)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#ef4444",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: 600,
    marginTop: "4px",
    width: "100%",
    transition: "all 0.2s ease",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
};
