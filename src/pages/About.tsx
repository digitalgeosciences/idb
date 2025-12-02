import { SiteShell } from "@/components/SiteShell";

const About = () => {
  return (
    <SiteShell>
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <section className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">About</h1>
          <p className="text-muted-foreground">
            The Integrative Dashboard is a web-based visualization tool designed to support research exploration,
            collaboration mapping, and knowledge discovery across research programs. It was created by{" "}
            <a
              href="https://qubalee.com/about"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              Dr. Abdullah Alqubalee
            </a>
            . All numbers and charts on the main pages (programs, topics, institutions, members, and publications)
            are computed from CSV files that are generated from cached OpenAlex bibliographic data.
          </p>
          <p className="text-muted-foreground">In practical terms, you can use the dashboard to:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
            <li>Explore publication and citation output by program, topic, institution, and member.</li>
            <li>See how topical coverage and institutional collaboration patterns evolve over time.</li>
            <li>Inspect individual publications and follow links out to their persistent identifiers.</li>
            <li>Navigate between summary metrics, detailed tables, and co-author network views.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Data pipeline</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
            <li>Authors and their program affiliations are defined in simple CSV files under the data folder.</li>
            <li>
              Node scripts download and cache each author&apos;s works from the OpenAlex data source,
              then export consolidated CSV tables for works, topics, institutions, and per-program
              impact.
            </li>
            <li>
              During the build step, these CSVs are converted into generated TypeScript tables that
              are loaded by the dashboard at runtime. All visible counts (publications, citations,
              topics, institutions, and member statistics) are derived from these tables.
            </li>
            <li>
              Co-author and program-network visualizations use cached JSON snapshots stored under the
              author-data folder. These snapshots are consistent with the CSV-based tables but may
              include additional relationship structure for the graph layouts.
            </li>
            <li>
              An RSS feed of recent publications is generated from the works CSV and published as{" "}
              <code>/rss.xml</code>, which can be subscribed to from most feed readers.
            </li>
            <li>
              Year-range, program, topic, institution, and author filters in the interface slice this
              precomputed data so all interactions remain fast and local, without live API calls.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Data limitations</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
            <li>Recorded names may differ from source records, and publication name spellings can vary.</li>
            <li>Similar or identical author names can appear worldwide and may be difficult to disambiguate.</li>
            <li>An individual author may publish under multiple name variants over time.</li>
            <li>Last-name spelling can be inconsistent (for example, adding or removing a hyphen or accent).</li>
            <li>
              Co-author graphs are based on cached OpenAlex snapshots and may include works that are
              not present in the current CSV tables, or omit very recent updates from the source.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Future enhancements</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
            <li>
              Store all derived data in a lightweight, offline database (for example, SQLite) to
              make updates and queries faster as the dataset grows.
            </li>
            <li>
              Integrate journal- and venue-ranking information so publications can be filtered and
              summarized by journal quality tiers.
            </li>
            <li>
              Provide richer analysis views that let users define custom criteria (programs, years,
              topics, institutions, journal ranks) and generate tailored summary charts and tables.
            </li>
          </ul>
        </section>

        <section>
          <p className="text-muted-foreground mb-6">
            For questions, feedback, or suggestions about this dashboard or the underlying data, please
            contact the Digital Geosciences team at{" "}
            <a
              href="mailto:info@digitalgeosciences.com"
              className="text-primary underline"
            >
              info@digitalgeosciences.com
            </a>
          </p>

        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Disclaimer</h2>
          <p className="text-sm text-muted-foreground">
            This dashboard is based on experimental, locally cached bibliographic data.
            Counts, classifications, and affiliations may contain errors or omissions.
            The dashboard is intended for exploration and internal insight only and
            should not be used for formal evaluation, assessment, or decision‑making
            about individual researchers or programs.
          </p>
        </section>

      </main>
    </SiteShell>
  );
};

export default About;
