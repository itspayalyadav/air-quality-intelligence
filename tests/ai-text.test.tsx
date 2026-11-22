import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiText } from "@/components/recommendation-list";

const render = (text: string) => renderToStaticMarkup(<AiText text={text} />);
const paragraphs = (html: string) => (html.match(/<p[ >]/g) ?? []).length;

describe("AiText markdown rendering", () => {
  it("renders **bold** as strong text without leaking asterisks", () => {
    const html = render("**Kolkata Air Briefing**");

    expect(html).toContain("<strong");
    expect(html).toContain("Kolkata Air Briefing");
    expect(html).not.toContain("**");
  });

  it("keeps each markdown paragraph and inline line break", () => {
    const html = render("First paragraph.\n\nSecond paragraph.\nSoft-wrapped line.");

    expect(paragraphs(html)).toBe(2);
    expect(html).toContain("First paragraph.");
    expect(html).toContain("Second paragraph.");
    expect(html).toContain("<br/>");
  });

  it("renders dash and asterisk lists as real bullets", () => {
    const html = render("- Close the windows\n* Run a purifier");

    expect(html).toContain("<ul");
    expect((html.match(/<li[ >]/g) ?? []).length).toBe(2);
    expect(html).not.toContain("- Close the windows");
    expect(html).not.toContain("* Run a purifier");
  });

  it("renders GFM tables and numbered lists", () => {
    const html = render("1. Morning\n2. Evening\n\n| A | B |\n| - | - |\n| 1 | 2 |");

    expect(html).toContain("<ol");
    expect(html).toContain("<table");
    expect(html).toContain("<td");
  });

  it("leaves plain text alone", () => {
    const html = render("The air is acceptable for most people today.");

    expect(paragraphs(html)).toBe(1);
    expect(html).toContain("The air is acceptable for most people today.");
    expect(html).not.toContain("<strong");
    expect(html).not.toContain("<ul");
  });

  it("keeps the boxed Limits line used by the assistant", () => {
    const html = render("Answer body.\n\nLimits: I only know the modelled outdoor reading.");

    expect(html).toContain("Limits: I only know the modelled outdoor reading.");
    expect(html).toContain("bg-stone-50");
  });

  it("shows a neutral message for an empty response", () => {
    const html = render("   \n ");

    expect(html).toContain("No text came back from the model");
    expect(html).not.toContain("<strong");
  });
});
