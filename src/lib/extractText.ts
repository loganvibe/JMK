// Client-side text extraction from uploaded documents.
import mammoth from "mammoth";

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg", ".heic", ".heif"];

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (IMAGE_EXTS.some((ext) => name.endsWith(ext)) || file.type.startsWith("image/")) {
    throw new Error("Image files are not supported for text extraction. Please upload a PDF, DOCX, TXT, or MD file.");
  }

  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return await file.text();
  }

  if (name.endsWith(".docx")) {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value || "";
  }

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    // Dynamic import so pdfjs only loads when needed
    const pdfjs: { GlobalWorkerOptions: { workerSrc: string }; getDocument: (opts: { data: ArrayBuffer }) => { promise: { then: (fn: (pdf: unknown) => unknown) => unknown } } } = await import("pdfjs-dist");
    // Use the worker from the same package via CDN-less URL bundling
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = (content.items as unknown as { str: string }[]).map((it) => it.str).filter(Boolean);
      out += strings.join(" ") + "\n\n";
    }
    return out;
  }

  // Fallback attempt
  try {
    return await file.text();
  } catch {
    return "";
  }
}
