import { describe, it, expect } from "vitest";
import {
  generateMarkdown,
  exportToDocx,
  exportToPdf,
  exportRefineToDocx,
  exportRefineToPdf,
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
});
