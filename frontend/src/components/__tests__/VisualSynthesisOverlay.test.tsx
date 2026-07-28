import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { VisualSynthesisOverlay } from "../VisualSynthesisOverlay";

describe("VisualSynthesisOverlay", () => {
  it("renders the overlay button", () => {
    render(<VisualSynthesisOverlay onRetrigger={() => {}} />);
    expect(screen.getByTestId("visual-synthesis-overlay")).toBeInTheDocument();
  });

  it("renders a RefreshCw icon inside the button", () => {
    render(<VisualSynthesisOverlay onRetrigger={() => {}} />);
    // lucide-react icons are mocked as SVGs with data-testid="icon-{Name}"
    expect(screen.getByTestId("icon-RefreshCw")).toBeInTheDocument();
  });

  it("calls onRetrigger when clicked", () => {
    const onRetrigger = vi.fn();
    render(<VisualSynthesisOverlay onRetrigger={onRetrigger} />);
    fireEvent.click(screen.getByTestId("visual-synthesis-overlay"));
    expect(onRetrigger).toHaveBeenCalledTimes(1);
  });

  it("has the correct title attribute", () => {
    render(<VisualSynthesisOverlay onRetrigger={() => {}} />);
    expect(screen.getByTestId("visual-synthesis-overlay")).toHaveAttribute(
      "title",
      "Re-trigger Visual Synthesis"
    );
  });

  it("has a circular shape via borderRadius", () => {
    render(<VisualSynthesisOverlay onRetrigger={() => {}} />);
    const button = screen.getByTestId("visual-synthesis-overlay");
    expect(button.style.borderRadius).toBe("50%");
    expect(button.style.width).toBe("36px");
    expect(button.style.height).toBe("36px");
  });
});
