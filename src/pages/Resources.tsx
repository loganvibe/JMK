import { SeoHead } from "@/components/common/SeoHead";

const Resources = () => (
  <div className="min-h-screen bg-background">
    <SeoHead
      title="JMK Student Resource Centre — Academic Project Guides"
      description="Free guides for Nigerian university students on final-year project topics, chapter writing, research methodology, and defence preparation."
      canonical="https://jmk.life/resources"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "JMK Student Resource Centre",
        description: "Educational guides for Nigerian university final-year projects.",
      }}
    />
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">JMK Student Resource Centre</h1>
      <p className="text-muted-foreground mb-6">
        Practical, original guidance for Nigerian university students writing final-year projects.
        These resources are educational references — not AI-generated shortcuts — and should be adapted to your own work.
      </p>
      <nav aria-label="Resource list">
        <ul className="space-y-2 list-disc pl-6">
          <li><a href="/resources/final-year-project-topics" className="text-accent underline">Choosing a final-year project topic</a></li>
          <li><a href="/resources/how-to-write-chapter-one" className="text-accent underline">How to write Chapter One</a></li>
          <li><a href="/resources/research-methodology" className="text-accent underline">Research methodology essentials</a></li>
          <li><a href="/resources/project-defence-preparation" className="text-accent underline">Project defence preparation</a></li>
          <li><a href="/resources/citation-and-referencing" className="text-accent underline">Citation and referencing</a></li>
        </ul>
      </nav>
    </main>
  </div>
);

export default Resources;
