import { SeoHead } from "@/components/common/SeoHead";

const ArticleChapterOne = () => (
  <div className="min-h-screen bg-background">
    <SeoHead
      title="How to Write Chapter One of a Final-Year Project | JMK"
      description="Step-by-step guide to writing Chapter One: background, problem statement, objectives, research questions, scope, and significance."
      canonical="https://jmk.life/resources/how-to-write-chapter-one"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "How to Write Chapter One of a Final-Year Project",
      }}
    />
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">How to Write Chapter One of a Final-Year Project</h1>
      <nav aria-label="Table of contents" className="mb-6 text-sm text-muted-foreground">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Background of study</li>
          <li>Problem statement</li>
          <li>Aim and objectives</li>
          <li>Research questions</li>
          <li>Scope and significance</li>
        </ol>
      </nav>
      <h2 className="text-xl font-semibold mt-6 mb-2">Background of study</h2>
      <p className="mb-4">Introduce the context and importance of your topic, narrowing to your specific focus.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Problem statement</h2>
      <p className="mb-4">Clearly state the gap or problem your research addresses.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Aim and objectives</h2>
      <p className="mb-4">State one aim and 3-5 measurable objectives.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Research questions</h2>
      <p className="mb-4">List questions aligned to your objectives.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Scope and significance</h2>
      <p className="mb-4">Define boundaries and who benefits from the research.</p>
      <p className="mt-8 text-sm text-muted-foreground">
        Draft and refine Chapter One with JMK's workspace. <a href="/signup" className="text-accent underline">Get started</a>.
      </p>
      <p className="mt-4 text-sm text-muted-foreground"><a href="/resources" className="text-accent underline">Back to resources</a></p>
    </main>
  </div>
);

export default ArticleChapterOne;
