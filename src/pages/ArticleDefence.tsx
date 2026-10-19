import { SeoHead } from "@/components/common/SeoHead";

const ArticleDefence = () => (
  <div className="min-h-screen bg-background">
    <SeoHead
      title="How to Prepare for a Final-Year Project Defence | JMK"
      description="Practical preparation steps for defending your final-year project: slides, questions, timing, and confidence."
      canonical="https://jmk.life/resources/project-defence-preparation"
      jsonLd={{ "@context": "https://schema.org", "@type": "Article", headline: "How to Prepare for a Final-Year Project Defence" }}
    />
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">How to Prepare for a Final-Year Project Defence</h1>
      <nav aria-label="Table of contents" className="mb-6 text-sm text-muted-foreground">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Understand the format</li>
          <li>Build your slides</li>
          <li>Anticipate questions</li>
          <li>Practice and timing</li>
        </ol>
      </nav>
      <h2 className="text-xl font-semibold mt-6 mb-2">Understand the format</h2>
      <p className="mb-4">Know how much time you have, who your panel is, and what they expect.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Build your slides</h2>
      <p className="mb-4">Summarise problem, method, results, and contribution. Keep slides clear and minimal.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Anticipate questions</h2>
      <p className="mb-4">Prepare answers for methodology choices, limitations, and future work.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Practice and timing</h2>
      <p className="mb-4">Rehearse within the time limit and get feedback from peers.</p>
      <p className="mt-8 text-sm text-muted-foreground">
        Use JMK's Defence Preparation module to organise your notes. <a href="/signup" className="text-accent underline">Get started</a>.
      </p>
      <p className="mt-4 text-sm text-muted-foreground"><a href="/resources" className="text-accent underline">Back to resources</a></p>
    </main>
  </div>
);

export default ArticleDefence;
