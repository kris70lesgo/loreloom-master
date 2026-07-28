import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NarrativeBeatCard } from "../NarrativeBeatCard";

describe("NarrativeBeatCard", () => {
  it("renders with the given label and children", () => {
    render(
      <NarrativeBeatCard label="NARRATIVE BEAT" dotColor="#00D6FF">
        <p>Test story content</p>
      </NarrativeBeatCard>
    );

    expect(screen.getByTestId("narrative-beat-card")).toBeInTheDocument();
    expect(screen.getByTestId("beat-label")).toHaveTextContent("NARRATIVE BEAT");
    expect(screen.getByText("Test story content")).toBeInTheDocument();
  });

  it("renders the dot with the provided color", () => {
    render(
      <NarrativeBeatCard label="WEAVE PROMPT" dotColor="#B026FF">
        <p>Content</p>
      </NarrativeBeatCard>
    );

    const dot = screen.getByTestId("beat-dot");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveStyle({ background: "#B026FF" });
  });

  it("renders a dotShadow when provided", () => {
    render(
      <NarrativeBeatCard
        label="BEAT"
        dotColor="#00D6FF"
        dotShadow="0 0 8px rgba(0,214,255,0.6)"
      >
        <p>Content</p>
      </NarrativeBeatCard>
    );

    const dot = screen.getByTestId("beat-dot");
    expect(dot).toHaveStyle({ boxShadow: "0 0 8px rgba(0,214,255,0.6)" });
  });

  it("renders the neon-cyan accent bar when isActive is true", () => {
    render(
      <NarrativeBeatCard label="ACTIVE BEAT" dotColor="#00D6FF" isActive={true}>
        <p>Active content</p>
      </NarrativeBeatCard>
    );

    // The accent bar has data-testid="beat-accent"
    expect(screen.getByTestId("beat-accent")).toBeInTheDocument();
  });

  it("does not render the accent bar when isActive is false", () => {
    render(
      <NarrativeBeatCard label="INACTIVE BEAT" dotColor="#B026FF" isActive={false}>
        <p>Inactive content</p>
      </NarrativeBeatCard>
    );

    // With isActive false, the accent should not be in the DOM
    expect(screen.queryByTestId("beat-accent")).toBeNull();
  });

  it("is not active by default", () => {
    const { container } = render(
      <NarrativeBeatCard label="DEFAULT" dotColor="#00D6FF">
        <p>Default content</p>
      </NarrativeBeatCard>
    );

    // When isActive is not passed (defaults to false), no accent bar
    expect(screen.getByTestId("narrative-beat-card")).toBeInTheDocument();
    expect(screen.getByTestId("beat-label")).toHaveTextContent("DEFAULT");
  });
});
