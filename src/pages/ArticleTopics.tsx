import { SeoHead } from "@/components/common/SeoHead";

const ArticleTopics = () => (
  <div className="min-h-screen bg-background">
    <SeoHead
      title="Final-Year Project Topics: How to Choose a Suitable Research Topic | JMK"
      description="A practical guide for Nigerian university students on choosing a final-year project topic that is feasible, relevant, and defensible."
      canonical="https://jmk.life/resources/final-year-project-topics"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Final-Year Project Topics: How to Choose a Suitable Research Topic",
        description: "A practical guide for Nigerian university students.",
      }}
    />
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">Final-Year Project Topics: How to Choose a Suitable Research Topic</h1>
      <nav aria-label="Table of contents" className="mb-6 text-sm text-muted-foreground">
        <ol className="list-decimal pl-5 space-y-1">
          <li>What makes a good topic</li>
          <li>Steps to choose a topic</li>
          <li>Examples by discipline</li>
          <li>Common mistakes to avoid</li>
        </ol>
      </nav>
      <h2 className="text-xl font-semibold mt-6 mb-2">What makes a good topic</h2>
      <p className="mb-4">A good final-year topic is feasible, relevant to your department, and supported by available data and supervision.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Steps to choose a topic</h2>
      <ol className="list-decimal pl-5 space-y-1 mb-4">
        <li>Review your department's past projects and supervisor interests.</li>
        <li>Identify a real problem in your context.</li>
        <li>Check data availability and feasibility within your timeframe.</li>
        <li>Draft a clear research question.</li>
        <li>Validate with your supervisor.</li>
      </ol>
      <h2 className="text-xl font-semibold mt-6 mb-2">Examples by discipline</h2>
      <ul className="list-disc pl-5 space-y-1 mb-4">
        <li>Computer Science: mobile health apps for rural clinics</li>
        <li>Business: impact of digital payments on SMEs</li>
        <li>Engineering: low-cost water purification systems</li>
      </ul>
      <h2 className="text-xl font-semibold mt-6 mb-2">Common mistakes to avoid</h2>
      <p className="mb-4">Avoid overly broad topics, topics with no data source, and topics outside your supervisor's expertise.</p>
      <p className="mt-8 text-sm text-muted-foreground">
        Use JMK's topic tools to explore department-specific suggestions. <a href="/signup" className="text-accent underline">Create an account</a>.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        <a href="/resources" className="text-accent underline">Back to resources</a>
      </p>
    </main>
  </div>
);

export default ArticleTopics;
