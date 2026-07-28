import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EntityDock } from "../EntityDock";

const defaultProps = {
  protagonist: "Ryo",
  relic: "Chronos Engine",
  style: "Neon Noir",
  stability: "98.4% Secure",
};

describe("EntityDock", () => {
  it("renders the dock container", () => {
    render(<EntityDock {...defaultProps} />);
    expect(screen.getByTestId("entity-dock")).toBeInTheDocument();
  });

  it("displays the protagonist name", () => {
    render(<EntityDock {...defaultProps} />);
    expect(screen.getByTestId("dock-value-protagonist")).toHaveTextContent("Ryo");
  });

  it("displays the relic name", () => {
    render(<EntityDock {...defaultProps} />);
    expect(screen.getByTestId("dock-value-relic")).toHaveTextContent("Chronos Engine");
  });

  it("displays the style value", () => {
    render(<EntityDock {...defaultProps} />);
    expect(screen.getByTestId("dock-value-style")).toHaveTextContent("Neon Noir");
  });

  it("displays the stability value", () => {
    render(<EntityDock {...defaultProps} />);
    expect(screen.getByTestId("dock-value-stability")).toHaveTextContent("98.4% Secure");
  });

  it("renders all four dock item icons", () => {
    render(<EntityDock {...defaultProps} />);
    // Icons are mocked as SVGs with data-testid="icon-{Name}"
    expect(screen.getByTestId("icon-User")).toBeInTheDocument();
    expect(screen.getByTestId("icon-Gem")).toBeInTheDocument();
    expect(screen.getByTestId("icon-Palette")).toBeInTheDocument();
    expect(screen.getByTestId("icon-Shield")).toBeInTheDocument();
  });

  it("renders dividers between items (3 dividers for 4 items)", () => {
    render(<EntityDock {...defaultProps} />);
    const dividers = screen.getAllByTestId("dock-divider");
    expect(dividers).toHaveLength(3);
  });

  it("has glassmorphic styling on the container", () => {
    render(<EntityDock {...defaultProps} />);
    const dock = screen.getByTestId("entity-dock");
    expect(dock.style.backdropFilter).toContain("blur");
    // jsdom normalizes rgba spacing and hex colors
    expect(dock.style.background).toMatch(/rgba\(0,\s*0,\s*0,\s*0\.55\)/);
    expect(dock.style.borderRadius).toBe("10px");
  });

  it("applies cyan text color to the stability value", () => {
    render(<EntityDock {...defaultProps} />);
    const stability = screen.getByTestId("dock-value-stability");
    // jsdom normalizes hex colors to rgb()
    expect(stability.style.color).toBe("rgb(0, 214, 255)");
  });

  it("handles long text with text overflow ellipsis", () => {
    render(
      <EntityDock
        protagonist="A very very long protagonist name that should be truncated"
        relic="An even longer relic name that should also be truncated with ellipsis"
        style="Neon Noir"
        stability="98.4% Secure"
      />
    );
    const prot = screen.getByTestId("dock-value-protagonist");
    expect(prot.style.overflow).toBe("hidden");
    expect(prot.style.textOverflow).toBe("ellipsis");
    expect(prot.style.whiteSpace).toBe("nowrap");
  });
});
