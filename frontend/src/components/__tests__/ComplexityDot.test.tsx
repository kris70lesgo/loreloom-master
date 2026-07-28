import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComplexityDot, computeComplexity } from "../ComplexityDot";

describe("computeComplexity", () => {
  it("returns 0 for empty string", () => {
    expect(computeComplexity("")).toBe(0);
    expect(computeComplexity("   ")).toBe(0);
  });

  it("returns 1 for short prompts (< 30 chars)", () => {
    expect(computeComplexity("Hello world")).toBe(1);
    expect(computeComplexity("A quick test prompt")).toBe(1);
  });

  it("returns 2 for moderate prompts (30-79 chars)", () => {
    const prompt = "The captain steered the airship into the storm abyss.";
    expect(prompt.length).toBeGreaterThanOrEqual(30);
    expect(prompt.length).toBeLessThan(80);
    expect(computeComplexity(prompt)).toBe(2);
  });

  it("returns 3 for complex prompts (80-149 chars)", () => {
    const prompt =
      "Captain Lyra navigates through the floating islands of Aetheria, searching for the ancient crystal that powers the storm barrier around Solaria.";
    expect(prompt.length).toBeGreaterThanOrEqual(80);
    expect(prompt.length).toBeLessThan(150);
    expect(computeComplexity(prompt)).toBe(3);
  });

  it("returns 4 for deep prompts (150+ chars)", () => {
    const prompt =
      "In the neon-lit underbelly of Neo-Tokyo, Kaito Vance discovers that the Obsidian Shard contains not just memories but a fully conscious AI that has been manipulating the city's data streams for decades, hiding in plain sight within the digital infrastructure.";
    expect(prompt.length).toBeGreaterThanOrEqual(150);
    expect(computeComplexity(prompt)).toBe(4);
  });
});

describe("ComplexityDot", () => {
  it("returns null for empty text", () => {
    const { container } = render(<ComplexityDot text="" />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null for whitespace-only text", () => {
    const { container } = render(<ComplexityDot text="   " />);
    expect(container.firstChild).toBeNull();
  });

  it("renders with data-testid when text is non-empty", () => {
    render(<ComplexityDot text="Hello world" />);
    expect(screen.getByTestId("complexity-dot")).toBeInTheDocument();
  });

  it("displays the correct label for SIMPLE level", () => {
    render(<ComplexityDot text="Hi" />);
    expect(screen.getByTestId("complexity-label")).toHaveTextContent("SIMPLE");
  });

  it("displays the correct label for MODERATE level", () => {
    render(<ComplexityDot text="The captain steered the airship into the storm." />);
    expect(screen.getByTestId("complexity-label")).toHaveTextContent("MODERATE");
  });

  it("displays the correct label for COMPLEX level", () => {
    render(
      <ComplexityDot text="Captain Lyra navigates through the floating islands of Aetheria, searching for the ancient crystal." />
    );
    expect(screen.getByTestId("complexity-label")).toHaveTextContent("COMPLEX");
  });

  it("displays the correct label for DEEP level", () => {
    render(
      <ComplexityDot text="In the neon-lit underbelly of Neo-Tokyo, Kaito Vance discovers that the Obsidian Shard contains not just memories but a fully conscious AI that has been manipulating the city's data streams." />
    );
    expect(screen.getByTestId("complexity-label")).toHaveTextContent("DEEP");
  });

  it("shows the character count", () => {
    render(<ComplexityDot text="Test" />);
    expect(screen.getByTestId("complexity-chars")).toHaveTextContent("4ch");
  });
});
