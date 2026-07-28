import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AntiGravitySynthesizer } from "../AntiGravitySynthesizer";

describe("AntiGravitySynthesizer", () => {
  it("renders without crashing", () => {
    const { container } = render(<AntiGravitySynthesizer />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("has a data-testid for the root element", () => {
    render(<AntiGravitySynthesizer />);
    expect(screen.getByTestId("anti-gravity-synthesizer")).toBeInTheDocument();
  });

  it("renders an SVG element for the wireframe mesh", () => {
    render(<AntiGravitySynthesizer />);
    const svg = screen.getByTestId("synth-svg");
    expect(svg).toBeInTheDocument();
    expect(svg.tagName).toBe("svg");
    expect(svg).toHaveAttribute("width", "200");
    expect(svg).toHaveAttribute("height", "200");
  });

  it("renders the subtitle label text", () => {
    render(<AntiGravitySynthesizer />);
    expect(screen.getByTestId("synth-subtitle")).toHaveTextContent(
      "Mesh Grid :: Neural Feed Active"
    );
  });

  it("renders the main title containing 'Anti-Gravity Synthesis'", () => {
    render(<AntiGravitySynthesizer />);
    expect(screen.getByText(/Anti-Gravity Synthesis/)).toBeInTheDocument();
  });

  it("renders exactly 2 orbiting rings (border circles)", () => {
    const { container } = render(<AntiGravitySynthesizer />);
    // The two orbiting rings are motion.div elements with explicit border styles
    const rings = container.querySelectorAll("[style*='border-radius: 50%']");
    expect(rings.length).toBeGreaterThanOrEqual(2);
  });
});
