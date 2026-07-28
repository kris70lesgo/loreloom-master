import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SimpleMarkdown } from "../SimpleMarkdown";

describe("SimpleMarkdown", () => {
  it("renders the container", () => {
    render(<SimpleMarkdown text="Hello world" />);
    expect(screen.getByTestId("simple-markdown")).toBeInTheDocument();
  });

  it("renders plain text as a paragraph", () => {
    render(<SimpleMarkdown text="Hello world" />);
    const para = screen.getByText("Hello world");
    expect(para).toBeInTheDocument();
    expect(para.tagName).toBe("P");
  });

  it("renders bold text wrapped in ** ** as a bold paragraph", () => {
    render(<SimpleMarkdown text="**Chapter One**" />);
    const boldText = screen.getByText("Chapter One");
    expect(boldText).toBeInTheDocument();
    expect(boldText.tagName).toBe("P");
    expect(boldText).toHaveStyle({ fontWeight: 700 });
  });

  it("renders list items starting with * ", () => {
    render(<SimpleMarkdown text={"* Item one\n* Item two"} />);
    const items = screen.getAllByTestId("md-list-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("• Item one");
    expect(items[1]).toHaveTextContent("• Item two");
  });

  it("renders horizontal rules for ---", () => {
    render(<SimpleMarkdown text={"Before" + String.fromCharCode(10) + "---" + String.fromCharCode(10) + "After"} />);
    const hr = screen.getByTestId("md-hr");
    expect(hr).toBeInTheDocument();
    expect(hr.tagName).toBe("HR");
  });

  it("renders multiple lines with different types", () => {
    const text = [
      "**Title**",
      "",
      "* First item",
      "* Second item",
      "",
      "Some body text.",
      "---",
      "**Footer**",
    ].join("\n");
    render(<SimpleMarkdown text={text} />);
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getAllByTestId("md-list-item")).toHaveLength(2);
    expect(screen.getByText("Some body text.")).toBeInTheDocument();
    expect(screen.getByTestId("md-hr")).toBeInTheDocument();
  });

  it("renders empty lines as non-breaking space paragraphs", () => {
    const text = ["Line 1", "", "Line 2"].join("\n");
    render(<SimpleMarkdown text={text} />);
    // The empty line becomes a paragraph with \u00A0
    const paras = screen.getAllByTestId("md-paragraph");
    expect(paras.length).toBeGreaterThanOrEqual(2);
  });

  it("handles empty text gracefully", () => {
    render(<SimpleMarkdown text="" />);
    // Empty string split gives [""] - renders one empty paragraph
    const paras = screen.getAllByTestId("md-paragraph");
    expect(paras).toHaveLength(1);
  });

  it("applies correct font family and line height to the container", () => {
    render(<SimpleMarkdown text="Hello" />);
    const container = screen.getByTestId("simple-markdown");
    expect(container.style.fontFamily).toContain("Inter");
    expect(container.style.lineHeight).toBe("1.6");
  });
});
