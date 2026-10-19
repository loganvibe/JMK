import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve(__dirname, "../../public");

describe("SEO assets", () => {
  it("sitemap.xml is valid XML with urlset", () => {
    const xml = fs.readFileSync(path.join(publicDir, "sitemap.xml"), "utf8");
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");
    expect(xml).not.toContain("index.html");
  });

  it("sitemap excludes private routes", () => {
    const xml = fs.readFileSync(path.join(publicDir, "sitemap.xml"), "utf8");
    for (const privatePath of ["/dashboard", "/my-projects", "/admin", "/projects/", "/refine", "/billing"]) {
      expect(xml).not.toContain(privatePath);
    }
  });

  it("robots.txt references sitemap", () => {
    const txt = fs.readFileSync(path.join(publicDir, "robots.txt"), "utf8");
    expect(txt).toContain("Sitemap: https://jmk.life/sitemap.xml");
    expect(txt).toContain("User-agent: *");
  });

  it("sitemap contains public article routes", () => {
    const xml = fs.readFileSync(path.join(publicDir, "sitemap.xml"), "utf8");
    expect(xml).toContain("/resources/final-year-project-topics");
    expect(xml).toContain("/resources/how-to-write-chapter-one");
    expect(xml).toContain("/resources/project-defence-preparation");
  });
});
