import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Footer,
  PageNumberElement,
  TableOfContents,
  AlignmentType,
} from "docx";
import { jsPDF } from "jspdf";

export type ProjectData = {
  id: string;
  title?: string;
  department?: string;
  course?: string;
  difficulty_level?: string;
  problem_statement?: string | null;
  objectives?: string | null;
  research_questions?: string | null;
  methodology?: string | null;
  scope?: string | null;
  expected_outcome?: string | null;
  status?: string;
};

export type SectionRow = {
  id?: string;
  chapter: string;
  section_type: string;
  title?: string | null;
  content: string | null;
  status: string;
};

export type RefineSection = {
  chapter: string;
  section: string;
  content: string;
  refined?: string;
};

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  downloadFileFromBlob(blob, filename);
}

function downloadFileFromBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateMarkdown(
  project: ProjectData,
  sections: SectionRow[],
): string {
  const parts: string[] = [];

  parts.push(`# ${project.title ?? "Untitled Project"}`);
  if (project.department) parts.push(`\n**Department:** ${project.department}`);
  if (project.course) parts.push(`\n**Course:** ${project.course}`);
  if (project.difficulty_level) parts.push(`\n**Difficulty:** ${project.difficulty_level}`);

  if (project.problem_statement) {
    parts.push("\n## Problem Statement\n\n" + project.problem_statement);
  }
  if (project.objectives) {
    parts.push("\n## Objectives\n\n" + project.objectives);
  }
  if (project.research_questions) {
    parts.push("\n## Research Questions\n\n" + project.research_questions);
  }
  if (project.methodology) {
    parts.push("\n## Methodology\n\n" + project.methodology);
  }
  if (project.scope) {
    parts.push("\n## Scope\n\n" + project.scope);
  }
  if (project.expected_outcome) {
    parts.push("\n## Expected Outcome\n\n" + project.expected_outcome);
  }

  const chapterOrder = [
    "chapter1", "chapter2", "chapter3", "chapter4", "chapter5",
    "references", "appendix",
  ];

  const completedSections = sections.filter((s) => s.status === "completed").length;
  const totalSections = sections.length;

  parts.push(`\nProject completion: ${completedSections} of ${totalSections} sections saved.\n`);

  for (const chapterKey of chapterOrder) {
    const chapterSections = sections.filter((s) => s.chapter === chapterKey);
    if (chapterSections.length === 0) continue;

    const chapterTitle = {
      chapter1: "Chapter 1: Introduction",
      chapter2: "Chapter 2: Literature Review",
      chapter3: "Chapter 3: Methodology",
      chapter4: "Chapter 4: Results and Analysis",
      chapter5: "Chapter 5: Conclusion",
      references: "References",
      appendix: "Appendix",
    }[chapterKey] ?? chapterKey;

    const incomplete = chapterSections.some((s) => s.status !== "completed");
    parts.push(`\n## ${chapterTitle}${incomplete ? " (Incomplete)" : ""}\n`);
    for (const sec of chapterSections) {
      if (sec.content && sec.content.trim()) {
        const marker = sec.status === "completed" ? "" : " *(Incomplete)*";
        parts.push(`\n### ${sec.section_type}${marker}\n\n${sec.content}`);
      } else {
        const marker = sec.status === "completed" ? "" : " *(Incomplete - no content saved)*";
        parts.push(`\n### ${sec.section_type}${marker}\n`);
      }
    }
  }

  return parts.join("\n").trim();
}

export function generateSectionMarkdown(
  project: ProjectData,
  section: SectionRow,
): string {
  const parts: string[] = [];
  parts.push(`# ${project.title ?? "Untitled Project"}`);
  if (project.department) parts.push(`\n**Department:** ${project.department}`);
  if (project.course) parts.push(`\n**Course:** ${project.course}`);
  const chapterTitle = {
    chapter1: "Chapter 1: Introduction",
    chapter2: "Chapter 2: Literature Review",
    chapter3: "Chapter 3: Methodology",
    chapter4: "Chapter 4: Results and Analysis",
    chapter5: "Chapter 5: Conclusion",
    references: "References",
    appendix: "Appendix",
  }[section.chapter] ?? section.chapter;
  parts.push(`\n## ${chapterTitle}\n`);
  const title = section.title ?? section.section_type;
  parts.push(`\n### ${title}`);
  const marker = section.status === "completed" ? "" : " *(Incomplete)*";
  parts.push(`${marker}\n\n${section.content ?? ""}\n`);
  return parts.join("\n").trim();
}

export function generateRefineMarkdown(sections: RefineSection[]): string {
  return sections
    .map((s) => `# ${s.chapter}\n## ${s.section}\n\n${s.refined ?? s.content}\n`)
    .join("\n\n")
    .trim();
}


export function safeFilename(name: string, ext: string): string {
  const base = (name ?? "project").trim().replace(/[\\/:*?""<>|]+/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${base || "project"}.${ext}`;
}
export async function exportToDocx(
  project: ProjectData,
  sections: SectionRow[],
): Promise<void> {
  const md = generateMarkdown(project, sections);
  const lines = md.split("\n");

  const chapterTitles = new Set([
    "Chapter 1: Introduction",
    "Chapter 2: Literature Review",
    "Chapter 3: Methodology",
    "Chapter 4: Results and Analysis",
    "Chapter 5: Conclusion",
    "References",
    "Appendix",
  ]);

  const children: (Paragraph | TextRun | TableOfContents)[] = [];
  let chapterCount = 0;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.TITLE, spacing: { after: 240 } }));
      children.push(new TableOfContents("Table of Contents", { headingStyleRange: "1-2" }));
    } else if (line.startsWith("## ")) {
      const text = line.slice(3);
      const isChapter = chapterTitles.has(text);
      if (isChapter) {
        chapterCount += 1;
      }
      children.push(new Paragraph({
        text,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        pageBreakBefore: isChapter && chapterCount > 1,
      }));
    } else if (line.startsWith("### ")) {
      children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }));
    } else if (line.startsWith("- ")) {
      children.push(new Paragraph({ text: line.slice(2), bullet: { level: 0 } }));
    } else if (line.trim() === "") {
      children.push(new Paragraph({ spacing: { after: 120 } }));
    } else if (line.startsWith("**") && line.includes("**", 2)) {
      const firstIdx = line.indexOf("**");
      const secondIdx = line.indexOf("**", firstIdx + 2);
      if (firstIdx !== -1 && secondIdx !== -1) {
        const before = line.slice(0, firstIdx);
        const bold = line.slice(firstIdx + 2, secondIdx);
        const after = line.slice(secondIdx + 2);
        children.push(new Paragraph({
          children: [
            new TextRun(before || ""),
            new TextRun({ text: bold, bold: true }),
            new TextRun(after || ""),
          ],
        }));
      } else {
        children.push(new Paragraph(line.replace(/\*\*/g, "")));
      }
    } else {
      children.push(new Paragraph(line.replace(/\*\*/g, "")));
    }
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      footer: {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 0 },
            children: [
              new TextRun("Page ", { size: 20 }),
              new PageNumberElement(),
            ],
          }),
        ],
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadFileFromBlob(blob, safeFilename(project.title ?? "project", "docx"));
}

export async function exportRefineToDocx(
  sections: RefineSection[],
  filename = "refined-project.docx",
): Promise<void> {
  const md = generateRefineMarkdown(sections);
  const lines = md.split("\n");
  const children: (Paragraph | TextRun)[] = [];

  for (const line of lines) {
    if (line.startsWith("# ")) {
      children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.TITLE, spacing: { after: 240 } }));
    } else if (line.startsWith("## ")) {
      children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }));
    } else if (line.startsWith("### ")) {
      children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }));
    } else if (line.startsWith("- ")) {
      children.push(new Paragraph({ text: line.slice(2), bullet: { level: 0 } }));
    } else if (line.trim() === "") {
      children.push(new Paragraph({ spacing: { after: 120 } }));
    } else {
      children.push(new Paragraph(line.replace(/\*\*/g, "")));
    }
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadFileFromBlob(blob, filename);
}

export async function exportToPdf(
  project: ProjectData,
  sections: SectionRow[],
): Promise<void> {
  const md = generateMarkdown(project, sections);
  const lines = md.split("\n");
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const maxLine = pageWidth - margin * 2;

  const chapterTitles = new Set([
    "Chapter 1: Introduction",
    "Chapter 2: Literature Review",
    "Chapter 3: Methodology",
    "Chapter 4: Results and Analysis",
    "Chapter 5: Conclusion",
    "References",
    "Appendix",
  ]);
  let chapterCount = 0;

  let y = margin;
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(project.title ?? "Project", margin, y);
  y += 30;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const meta = [project.department, project.course, project.status]
    .filter(Boolean)
    .join(" · ");
  if (meta) { doc.text(meta, margin, y); y += 20; }

  for (const line of lines) {
    if (line.startsWith("# ")) {
      const text = line.slice(2);
      const split = doc.splitTextToSize(text, maxLine);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(split, margin, y);
      y += split.length * 24 + 8;
    } else if (line.startsWith("## ")) {
      const text = line.slice(3);
      const isChapter = chapterTitles.has(text);
      if (isChapter) {
        chapterCount += 1;
        if (chapterCount > 1) {
          doc.addPage();
          y = margin;
        }
      }
      const split = doc.splitTextToSize(text, maxLine);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(split, margin, y);
      y += split.length * 18 + 6;
    } else if (line.startsWith("### ")) {
      const text = line.slice(4);
      const split = doc.splitTextToSize(text, maxLine);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(split, margin, y);
      y += split.length * 14 + 4;
    } else if (line.startsWith("- ")) {
      const text = line.slice(2);
      const split = doc.splitTextToSize(text, maxLine - 12);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("• " + split, margin + 12, y);
      y += split.length * 14 + 2;
    } else if (line.trim() === "") {
      y += 6;
    } else {
      const text = line.replace(/\*\*/g, "");
      const split = doc.splitTextToSize(text, maxLine);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(split, margin, y);
      y += split.length * 14 + 2;
    }
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 50, pageHeight - 30);
  }

  const blob = doc.output("blob");
  downloadFileFromBlob(blob, safeFilename(project.title ?? "project", "pdf"));
}

export async function exportRefineToPdf(
  sections: RefineSection[],
  filename = "refined-project.pdf",
): Promise<void> {
  const md = generateRefineMarkdown(sections);
  const lines = md.split("\n");
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const maxLine = pageWidth - margin * 2;

  let y = margin;
  for (const line of lines) {
    if (line.startsWith("# ")) {
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      const text = line.slice(2);
      const split = doc.splitTextToSize(text, maxLine);
      doc.text(split, margin, y);
      y += split.length * 24 + 8;
    } else if (line.startsWith("## ")) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const text = line.slice(3);
      const split = doc.splitTextToSize(text, maxLine);
      doc.text(split, margin, y);
      y += split.length * 18 + 6;
    } else if (line.startsWith("### ")) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const text = line.slice(4);
      const split = doc.splitTextToSize(text, maxLine);
      doc.text(split, margin, y);
      y += split.length * 14 + 4;
    } else if (line.startsWith("- ")) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const text = line.slice(2);
      const split = doc.splitTextToSize(text, maxLine - 12);
      doc.text("• " + split, margin + 12, y);
      y += split.length * 14 + 2;
    } else if (line.trim() === "") {
      y += 6;
    } else {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const text = line.replace(/\*\*/g, "");
      const split = doc.splitTextToSize(text, maxLine);
      doc.text(split, margin, y);
      y += split.length * 14 + 2;
    }
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  const blob = doc.output("blob");
  downloadFileFromBlob(blob, filename);
}

export function downloadMarkdown(project: ProjectData, sections: SectionRow[]): void {
  const md = generateMarkdown(project, sections);
  downloadBlob(md, safeFilename(project.title ?? "project", "md"), "text/markdown");
}

export function downloadSectionMarkdown(
  project: ProjectData,
  section: SectionRow,
): void {
  const md = generateSectionMarkdown(project, section);
  const filePart = safeFilename(
    `${project.title ?? "project"}-${section.section_type}`, "md",
  );
  downloadBlob(md, filePart, "text/markdown");
}

export async function exportSectionToDocx(
  project: ProjectData,
  section: SectionRow,
): Promise<void> {
  const md = generateSectionMarkdown(project, section);
  const lines = md.split("\n");

  const children: (Paragraph | TextRun)[] = [];
  for (const line of lines) {
    if (line.startsWith("# ")) {
      children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.TITLE, spacing: { after: 240 } }));
    } else if (line.startsWith("## ")) {
      children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }));
    } else if (line.startsWith("### ")) {
      children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }));
    } else if (line.startsWith("- ")) {
      children.push(new Paragraph({ text: line.slice(2), bullet: { level: 0 } }));
    } else if (line.trim() === "") {
      children.push(new Paragraph({ spacing: { after: 120 } }));
    } else if (line.startsWith("**") && line.includes("**", 2)) {
      const firstIdx = line.indexOf("**");
      const secondIdx = line.indexOf("**", firstIdx + 2);
      if (firstIdx !== -1 && secondIdx !== -1) {
        const before = line.slice(0, firstIdx);
        const bold = line.slice(firstIdx + 2, secondIdx);
        const after = line.slice(secondIdx + 2);
        children.push(new Paragraph({
          children: [
            new TextRun(before || ""),
            new TextRun({ text: bold, bold: true }),
            new TextRun(after || ""),
          ],
        }));
      } else {
        children.push(new Paragraph(line.replace(/\*\*/g, "")));
      }
    } else {
      children.push(new Paragraph(line.replace(/\*\*/g, "")));
    }
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadFileFromBlob(
    blob,
    safeFilename(`${project.title ?? "project"}-${section.section_type}`, "docx"),
  );
}

export async function exportSectionToPdf(
  project: ProjectData,
  section: SectionRow,
): Promise<void> {
  const md = generateSectionMarkdown(project, section);
  const lines = md.split("\n");
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const maxLine = pageWidth - margin * 2;

  let y = margin;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  const title = doc.splitTextToSize(project.title ?? "Project", maxLine);
  doc.text(title, margin, y);
  y += title.length * 24 + 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const meta = [project.department, project.course]
    .filter(Boolean)
    .join(" · ");
  if (meta) { doc.text(meta, margin, y); y += 20; }

  const chapterTitle = {
    chapter1: "Chapter 1: Introduction",
    chapter2: "Chapter 2: Literature Review",
    chapter3: "Chapter 3: Methodology",
    chapter4: "Chapter 4: Results and Analysis",
    chapter5: "Chapter 5: Conclusion",
    references: "References",
    appendix: "Appendix",
  }[section.chapter] ?? section.chapter;
  const chapterSplit = doc.splitTextToSize(chapterTitle, maxLine);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(chapterSplit, margin, y);
  y += chapterSplit.length * 18 + 6;

  const label = section.title ?? section.section_type;
  const marker = section.status === "completed" ? "" : " (Incomplete)";
  const labelSplit = doc.splitTextToSize(`${label}${marker}`, maxLine);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(labelSplit, margin, y);
  y += labelSplit.length * 14 + 4;

  for (const line of lines) {
    if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ")) {
      continue;
    } else if (line.startsWith("- ")) {
      const text = line.slice(2);
      const split = doc.splitTextToSize(text, maxLine - 12);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("• " + split, margin + 12, y);
      y += split.length * 14 + 2;
    } else if (line.trim() === "") {
      y += 6;
    } else {
      const text = line.replace(/\*\*/g, "");
      const split = doc.splitTextToSize(text, maxLine);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(split, margin, y);
      y += split.length * 14 + 2;
    }
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  const blob = doc.output("blob");
  downloadFileFromBlob(
    blob,
    safeFilename(`${project.title ?? "project"}-${section.section_type}`, "pdf"),
  );
}

export function downloadRefineMarkdown(sections: RefineSection[], filename = "refined-project.md"): void {
  const md = generateRefineMarkdown(sections);
  downloadBlob(md, filename, "text/markdown");
}


