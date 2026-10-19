import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ArticleTopics from "@/pages/ArticleTopics";
import ArticleChapterOne from "@/pages/ArticleChapterOne";
import ArticleDefence from "@/pages/ArticleDefence";
import Resources from "@/pages/Resources";

describe("article routes render", () => {
  it("renders topics article", () => {
    render(<MemoryRouter initialEntries={["/resources/final-year-project-topics"]}><Routes><Route path="/resources/final-year-project-topics" element={<ArticleTopics />} /></Routes></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });
  it("renders chapter one article", () => {
    render(<MemoryRouter initialEntries={["/resources/how-to-write-chapter-one"]}><Routes><Route path="/resources/how-to-write-chapter-one" element={<ArticleChapterOne />} /></Routes></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });
  it("renders defence article", () => {
    render(<MemoryRouter initialEntries={["/resources/project-defence-preparation"]}><Routes><Route path="/resources/project-defence-preparation" element={<ArticleDefence />} /></Routes></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });
  it("renders resources hub", () => {
    render(<MemoryRouter initialEntries={["/resources"]}><Routes><Route path="/resources" element={<Resources />} /></Routes></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });
});
