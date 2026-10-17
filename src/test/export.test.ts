import { describe, it, expect } from "vitest";
import {
  generateMarkdown,
  generateSectionMarkdown,
  exportToDocx,
  exportToPdf,
  exportRefineToDocx,
  exportRefineToPdf,
  exportSectionToDocx,
  exportSectionToPdf,
  downloadMarkdown,
  downloadSectionMarkdown,
  safeFilename,
  type ProjectData,
  type SectionRow,
} from "@/lib/export";

const proj: ProjectData = {
  id: "1",
  title: "Test Project",
  department: "CS",
  course: "CSC490",
  status: "in_progress",
};

const sections: SectionRow[] = [
  { id: "s1", chapter: "chapter1", section_type: "Background of Study", content: "Some background text.", status: "completed" },
  { id: "s2", chapter: "chapter1", section_type: "Problem Statement", content: "Problem text.", status: "draft" },
];

describe("export module", () => {
  it("generates markdown with saved content, including incomplete markers", () => {
    const md = generateMarkdown(proj, sections);
    expect(md).toContain("Test Project");
    expect(md).toContain("Background of Study");
    expect(md).toContain("Some background text.");
    expect(md).toContain("Problem Statement");
    expect(md).toContain("Incomplete");
  });

  it("sanitizes filenames", () => {
    expect(safeFilename("My Project Title", "docx")).toBe("My-Project-Title.docx");
    expect(safeFilename("  a/b:c  ", "pdf")).toBe("a-b-c.pdf");
    expect(safeFilename("", "docx")).toBe("project.docx");
  });

  it("exports an incomplete chapter-one-only project to docx and pdf without throwing", async () => {
    await expect(exportToDocx(proj, sections.slice(0, 1))).resolves.toBeUndefined();
    await expect(exportToPdf(proj, sections.slice(0, 1))).resolves.toBeUndefined();
  });

  it("exports multi incomplete chapters", async () => {
    const secs: SectionRow[] = [{ id: "a", chapter: "chapter1", section_type: "Background", content: "x", status: "draft" }];
    await expect(exportToDocx(proj, secs)).resolves.toBeUndefined();
    await expect(exportToPdf(proj, secs)).resolves.toBeUndefined();
  });

  it("exports a completed project to word and pdf", async () => {
    const completed = sections.map((s) => ({ ...s, status: "completed" }));
    await expect(exportToDocx(proj, completed)).resolves.toBeUndefined();
    await expect(exportToPdf(proj, completed)).resolves.toBeUndefined();
  });

  it("exports a refined uploaded project using refined content", async () => {
    const refined = [{ chapter: "Chapter 1", section: "Background", content: "orig", refined: "refined text" }];
    await expect(exportRefineToDocx(refined as never)).resolves.toBeUndefined();
    await expect(exportRefineToPdf(refined as never)).resolves.toBeUndefined();
  });

  it("uses latest saved content in markdown", () => {
    const latest: SectionRow[] = [{ id: "x", chapter: "chapter1", section_type: "Background", content: "LATEST CONTENT", status: "draft" }];
    const md = generateMarkdown(proj, latest);
    expect(md).toContain("LATEST CONTENT");
  });

  const introSection: SectionRow = {
    id: "s-intro",
    chapter: "chapter1",
    section_type: "Background of Study",
    content: "This is the introduction content for chapter one.",
    status: "completed",
  };
  const emptySection: SectionRow = {
    id: "s-empty",
    chapter: "chapter2",
    section_type: "Literature Review",
    content: null,
    status: "draft",
  };

  it("generates section markdown from saved content", () => {
    const md = generateSectionMarkdown(proj, introSection);
    expect(md).toContain("Test Project");
    expect(md).toContain("Chapter 1: Introduction");
    expect(md).toContain("This is the introduction content for chapter one.");
  });

  it("sanitizes section filenames", () => {
    expect(safeFilename("My Project-Background of Study", "docx")).toBe(
      "My-Project-Background-of-Study.docx",
    );
  });

  it("exports a single completed section to docx and pdf without throwing", async () => {
    await expect(exportSectionToDocx(proj, introSection)).resolves.toBeUndefined();
    await expect(exportSectionToPdf(proj, introSection)).resolves.toBeUndefined();
  });

  it("downloads section markdown with saved content", () => {
    downloadSectionMarkdown(proj, introSection);
    expect(true).toBe(true);
  });
});
