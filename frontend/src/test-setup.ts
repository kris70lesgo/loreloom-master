import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock @untitledui/icons to avoid hook errors in jsdom
vi.mock("@untitledui/icons", () => {
  const React = require("react") as typeof import("react");
  const icons = [
    "Home01", "LayoutGrid01", "Folder", "Settings01", "HelpCircle",
    "LinkExternal01", "ChevronDown", "ChevronRight", "LayoutLeft",
    "Stars01", "LayersThree01", "LogOut01", "DotsVertical",
    "DotsHorizontal", "Trash01", "CpuChip01", "Database01",
    "CheckCircle", "Lock01", "LockUnlocked01", "Maximize01",
    "Minimize01", "DotsGrid", "Loading01", "MagicWand01",
    "BookOpen01", "Film01", "Image01", "Square", "Plus",
    "User01", "Diamond01", "Palette", "Shield01", "Hash01", "Share01",
    "Link01", "XClose", "RefreshCw01", "Sun", "LayoutAlt02"
  ];
  const aliases: Record<string, string> = {
    Home01: "Home",
    LayoutGrid01: "LayoutDashboard",
    Settings01: "Settings",
    LinkExternal01: "ExternalLink",
    LayoutLeft: "LayoutLeft",
    Stars01: "Sparkles",
    LayersThree01: "Layers",
    LogOut01: "LogOut",
    DotsVertical: "MoreVertical",
    DotsHorizontal: "MoreHorizontal",
    Trash01: "Trash2",
    CpuChip01: "Cpu",
    Database01: "Database",
    Lock01: "Lock",
    LockUnlocked01: "Unlock",
    Maximize01: "Maximize2",
    Minimize01: "Minimize2",
    DotsGrid: "GripVertical",
    Loading01: "Loader2",
    MagicWand01: "Wand2",
    BookOpen01: "BookOpen",
    Film01: "Film",
    Image01: "Image",
    User01: "User",
    Diamond01: "Gem",
    Shield01: "Shield",
    Hash01: "Hash",
    Share01: "Share2",
    Link01: "Link",
    XClose: "X",
    RefreshCw01: "RefreshCw",
    Sun: "Sun",
  };
  const mock: Record<string, any> = {};
  for (const name of icons) {
    const component = React.forwardRef<any, any>((props: any, ref: any) => {
      const { size, color, className, ...rest } = props;
      const testIdName = aliases[name] || name;
      return React.createElement("svg", {
        ...rest,
        ref,
        "data-testid": `icon-${testIdName}`,
        width: size || 24,
        height: size || 24,
        fill: "none",
        stroke: color || "currentColor",
        viewBox: "0 0 24 24",
      });
    });
    mock[name] = component;
    
    // Also export the aliased names if imported directly
    const aliasName = aliases[name];
    if (aliasName && aliasName !== name) {
      mock[aliasName] = component;
    }
  }
  return mock;
});

// Mock framer-motion for jsdom test environment
vi.mock("framer-motion", () => {
  const React = require("react") as typeof import("react");

  const createMotionComponent = (tag: string) => {
    const htmlTag = tag.replace("motion.", "");
    const Component = React.forwardRef<any, any>((props: any, ref: any) => {
      const {
        initial,
        animate,
        exit,
        transition,
        variants,
        whileHover,
        whileTap,
        whileFocus,
        whileDrag,
        whileInView,
        layout,
        layoutId,
        layoutDependency,
        onAnimationStart,
        onAnimationComplete,
        drag,
        dragConstraints,
        dragElastic,
        dragControls,
        dragListener,
        dragMomentum,
        dragPropagation,
        direction,
        onDrag,
        onDragEnd,
        onDragStart,
        ...htmlProps
      } = props;

      return React.createElement(htmlTag, { ...htmlProps, ref });
    });
    Component.displayName = `motion.${htmlTag}`;
    return Component;
  };

  const motion = new Proxy(
    {},
    {
      get: (_target: any, prop: string) => {
        return createMotionComponent(`motion.${prop}`);
      },
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    MotionConfig: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    default: { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children) },
  };
});

// Mock lucide-react to avoid hook errors in jsdom
vi.mock("lucide-react", () => {
  const React = require("react") as typeof import("react");
  const icons = [
    "GripVertical", "Layers", "Film", "Database", "Link2", "Play", "Eye", "Plus", "Trash2", "ChevronLeft", "ChevronRight"
  ];
  const mock: Record<string, any> = {};
  for (const name of icons) {
    mock[name] = React.forwardRef<any, any>((props: any, ref: any) => {
      const { size, color, className, ...rest } = props;
      return React.createElement("svg", {
        ...rest,
        ref,
        "data-testid": `icon-${name}`,
        width: size || 24,
        height: size || 24,
        fill: "none",
        stroke: color || "currentColor",
        viewBox: "0 0 24 24",
      });
    });
  }
  return mock;
});
