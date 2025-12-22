import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, Users, Award, FileText, User, ArrowUpRight } from "lucide-react";
import { authors } from "@/data/authors.generated";
import { useNavigate } from "react-router-dom";
import { SiteShell } from "@/components/SiteShell";
import { worksTable } from "@/data/worksTable.generated";
import { filterWorks } from "@/lib/blacklist";
import dashboardConfigJson from "@/data/dashboardConfig.json";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SimpleTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload as { label?: string } | undefined;
  const label = data?.label ?? payload[0]?.name ?? "";
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-sm">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((entry) => {
        const name = entry.name ?? "";
        const value = entry.value;
        if (value == null) return null;
        const display = typeof value === "number" ? value.toLocaleString() : String(value);
        return (
          <div key={name} className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: entry.color }} />
            <span>{name}:</span>
            <span className="font-semibold">{display}</span>
          </div>
        );
      })}
    </div>
  );
};

type DashboardConfig = {
  showStats: boolean;
  showCharts: boolean;
  showProgramsTable: boolean;
  statCards: {
    programs: boolean;
    members: boolean;
    topics: boolean;
    institutions: boolean;
    publications: boolean;
    citations: boolean;
  };
};

const dashboardConfig = (dashboardConfigJson as DashboardConfig) || {
  showStats: true,
  showCharts: true,
  showProgramsTable: false,
  statCards: {
    programs: false,
    members: true,
    topics: true,
    institutions: true,
    publications: true,
    citations: true,
  },
};

const Index = () => {
  const navigate = useNavigate();
  const INITIAL_PUBLICATIONS_LIMIT = 9;
  const INITIAL_TOPICS_LIMIT = 20;
  const PUBLICATIONS_STEP = 6;
  const TOPICS_STEP = 10;

  const memberCount = authors.length;
  const cleanWorks = useMemo(() => filterWorks(worksTable), []);

  const allYears = useMemo(() => {
    const years = new Set<number>();
    cleanWorks.forEach((w) => {
      if (typeof w.year === "number") years.add(w.year);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [cleanWorks]);

  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);
  const [publicationLimit, setPublicationLimit] = useState<number>(INITIAL_PUBLICATIONS_LIMIT);
  const [topicLimit, setTopicLimit] = useState<number>(INITIAL_TOPICS_LIMIT);

  useEffect(() => {
    if (!allYears.length) return;
    setStartYear((prev) => (prev == null ? allYears[0] : prev));
    setEndYear((prev) => (prev == null ? allYears[allYears.length - 1] : prev));
  }, [allYears]);

  const perYearAggregates = useMemo(() => {
    const map = new Map<
      number,
      { publications: number; citations: number; topics: Set<string>; institutions: Set<string> }
    >();
    for (const work of cleanWorks) {
      if (typeof work.year !== "number") continue;
      const entry =
        map.get(work.year) ??
        { publications: 0, citations: 0, topics: new Set<string>(), institutions: new Set<string>() };
      entry.publications += 1;
      entry.citations += work.citations || 0;
      (work.topics || []).forEach((t) => {
        if (t) entry.topics.add(t);
      });
      (work.institutions || []).forEach((inst) => {
        if (inst) entry.institutions.add(inst);
      });
      map.set(work.year, entry);
    }
    return map;
  }, [cleanWorks]);

  const totalPublicationsInRange = useMemo(() => {
    if (!allYears.length) return 0;
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];
    return cleanWorks.reduce((count, work) => {
      if (typeof work.year !== "number") return count;
      if (work.year < from || work.year > to) return count;
      return count + 1;
    }, 0);
  }, [allYears, startYear, endYear, cleanWorks]);

  const totalCitationsInRange = useMemo(() => {
    if (!allYears.length) return 0;
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];
    return cleanWorks.reduce((sum, work) => {
      if (typeof work.year !== "number") return sum;
      if (work.year < from || work.year > to) return sum;
      return sum + (work.citations || 0);
    }, 0);
  }, [allYears, startYear, endYear, cleanWorks]);

  const topicsTotals = useMemo(() => {
    if (!allYears.length) return { total: 0 };
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];
    const totalSet = new Set<string>();

    for (const [year, entry] of perYearAggregates.entries()) {
      if (year >= from && year <= to) {
        entry.topics.forEach((t) => totalSet.add(t));
      }
    }

    return {
      total: totalSet.size,
    };
  }, [allYears, startYear, endYear, perYearAggregates]);

  const institutionsTotals = useMemo(() => {
    if (!allYears.length) return { total: 0 };
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];
    const totalSet = new Set<string>();

    for (const [year, entry] of perYearAggregates.entries()) {
      if (year >= from && year <= to) {
        entry.institutions.forEach((i) => totalSet.add(i));
      }
    }

    return {
      total: totalSet.size,
    };
  }, [allYears, startYear, endYear, perYearAggregates]);

  const topicsChartData = useMemo(() => {
    const from = startYear ?? (allYears.length ? allYears[0] : undefined);
    const to = endYear ?? (allYears.length ? allYears[allYears.length - 1] : undefined);
    return Array.from(perYearAggregates.entries())
      .sort(([a], [b]) => a - b)
      .filter(([year]) => {
        if (from != null && year < from) return false;
        if (to != null && year > to) return false;
        return true;
      })
      .map(([year, entry]) => ({
        year,
        label: String(year),
        topics: entry.topics.size,
        publications: entry.publications,
      }));
  }, [allYears, startYear, endYear, perYearAggregates]);

  const sortedPublications = useMemo(() => {
    return [...cleanWorks]
      .sort((a, b) => {
        const aDate = a.publicationDate || `${a.year || 0}-01-01`;
        const bDate = b.publicationDate || `${b.year || 0}-01-01`;
        return bDate.localeCompare(aDate);
      })
      .filter(Boolean);
  }, [cleanWorks]);

  const recentPublications = useMemo(() => {
    return sortedPublications.slice(0, Math.max(0, publicationLimit));
  }, [sortedPublications, publicationLimit]);

  const sortedTopTopics = useMemo(() => {
    const counts = new Map<string, number>();
    const from = startYear ?? (allYears.length ? allYears[0] : undefined);
    const to = endYear ?? (allYears.length ? allYears[allYears.length - 1] : undefined);
    for (const work of cleanWorks) {
      if (work.year && from != null && work.year < from) continue;
      if (work.year && to != null && work.year > to) continue;
      (work.topics || []).forEach((t) => {
        if (!t) return;
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [allYears, startYear, endYear, cleanWorks]);

  const topTopics = useMemo(() => {
    return sortedTopTopics.slice(0, Math.max(0, topicLimit));
  }, [sortedTopTopics, topicLimit]);

  const hasMorePublications = publicationLimit < sortedPublications.length;
  const hasMoreTopics = topicLimit < sortedTopTopics.length;

  const buildRangeParams = () => {
    const from = startYear ?? (allYears.length ? allYears[0] : undefined);
    const to = endYear ?? (allYears.length ? allYears[allYears.length - 1] : undefined);
    const search = new URLSearchParams();
    if (from != null) search.set("fromYear", String(from));
    if (to != null) search.set("toYear", String(to));
    return search;
  };

  return (
    <SiteShell>
      <main className="container mx-auto px-4 py-4 sm:py-8">
        {allYears.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Year range:</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">From</span>
              <select
                className="h-7 rounded border border-border bg-background px-2 text-xs"
                value={startYear ?? ""}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setStartYear(value);
                  if (endYear != null && value > endYear) setEndYear(value);
                }}
              >
                {allYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="font-semibold text-foreground">to</span>
              <select
                className="h-7 rounded border border-border bg-background px-2 text-xs"
                value={endYear ?? ""}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setEndYear(value);
                  if (startYear != null && value < startYear) setStartYear(value);
                }}
              >
                {allYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {dashboardConfig.showStats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-6 text-xs sm:text-sm">
            {dashboardConfig.statCards.members && (
              <StatCard
                title="Members"
                value={<span title={memberCount.toLocaleString()}>{memberCount}</span>}
                icon={Users}
                onClick={() => navigate("/members")}
                actionLabel="view"
              />
            )}
            {dashboardConfig.statCards.topics && (
              <StatCard
                title="Topics"
                value={<span title={topicsTotals.total.toLocaleString()}>{topicsTotals.total.toLocaleString()}</span>}
                icon={TrendingUp}
                actionLabel="view"
                onClick={() => navigate("/topics")}
              />
            )}
            {dashboardConfig.statCards.institutions && (
              <StatCard
                title="Institutions"
                value={<span title={institutionsTotals.total.toLocaleString()}>{institutionsTotals.total.toLocaleString()}</span>}
                icon={TrendingUp}
                actionLabel="view"
                onClick={() => navigate("/institutions")}
              />
            )}
            {dashboardConfig.statCards.publications && (
              <StatCard
                title="Publications"
                value={<span title={totalPublicationsInRange.toLocaleString()}>{totalPublicationsInRange.toLocaleString()}</span>}
                icon={TrendingUp}
                actionLabel="view"
                onClick={() => navigate("/publications")}
              />
            )}
            {dashboardConfig.statCards.citations && (
              <StatCard
                title="Citations"
                value={<span title={totalCitationsInRange.toLocaleString()}>{totalCitationsInRange.toLocaleString()}</span>}
                icon={Award}
                actionLabel="view"
                onClick={() => navigate("/citations")}
              />
            )}
          </div>
        )}

        {/* Topic & institution trend (single chart) */}
        {dashboardConfig.showCharts && (
          <section className="mb-10">
            <Card className="border-border/60">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>Topic stats</span>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-sm bg-[#22c55e]" />
                    <span>Topics (unique topics)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-sm bg-[#7c3aed]" />
                    <span>Publications</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topicsChartData} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="year"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 12,
                        }}
                      />
                      <Tooltip content={<SimpleTooltip />} />
                      <Bar dataKey="topics" name="Topics (unique topics)" fill="#22c55e" />
                      <Bar
                        dataKey="publications"
                        name="Publications"
                        fill="#7c3aed"
                        opacity={0.8}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Recent publications + Trending topics side by side */}
        <section className="space-y-4 mb-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Recent publications</span>
                </h2>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90"
                  onClick={() => navigate("/publications")}
                >
                  View all
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {recentPublications.map((work) => (
                  <Card key={work.workId} className="border-border/60">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                      <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1">
                        <FileText className="h-3 w-3 text-primary" />
                        <span>
                          {work.publicationDate
                            ? new Date(work.publicationDate).toLocaleString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : work.year || "Year n/a"}
                        </span>
                        {work.venue ? (
                          <>
                            <span aria-hidden>{"\u2022"}</span>
                            <span className="text-primary font-medium">{work.venue}</span>
                          </>
                        ) : null}
                      </div>
                          <h3 className="text-sm font-semibold text-primary leading-snug hover:underline">
                            {(() => {
                              const cleanedDoi = work.doi
                                ? work.doi
                                    .replace(/^https?:\/\/(www\.)?doi\.org\//i, "")
                                    .replace(/^doi:/i, "")
                                    .trim()
                                : "";
                              const href = cleanedDoi
                                ? `https://doi.org/${cleanedDoi}`
                                : work.workId
                                  ? `https://openalex.org/${work.workId}`
                                  : undefined;
                              return (
                                <a href={href} target="_blank" rel="noreferrer">
                                  {work.title}
                                </a>
                              );
                            })()}
                          </h3>
                          {work.allAuthors?.length ? (() => {
                            const names = work.allAuthors.filter(Boolean);
                            const fullList = names.join(", ");
                            return (
                              <p
                                className="text-xs text-muted-foreground mt-1"
                                title={fullList}
                              >
                                <User className="mr-1 inline-block h-3 w-3 text-primary" />
                                <span>{fullList || "Author n/a"}</span>
                              </p>
                            );
                          })() : null}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div className="font-semibold text-foreground">
                            {(work.citations || 0).toLocaleString()}
                          </div>
                          <div>Citations</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {sortedPublications.length > INITIAL_PUBLICATIONS_LIMIT && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground shadow hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() =>
                      setPublicationLimit((prev) =>
                        Math.min(prev + PUBLICATIONS_STEP, sortedPublications.length),
                      )
                    }
                    disabled={!hasMorePublications}
                  >
                    Load more
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground shadow hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setPublicationLimit(sortedPublications.length)}
                    disabled={!hasMorePublications}
                  >
                    Load all
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>Trending topics</span>
                </h2>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90"
                  onClick={() => navigate("/topics")}
                >
                  View all
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
              <Card className="border-border/60">
                <CardContent className="p-3 pb-2">
                  <div className="grid gap-2">
                    {topTopics.map((topic, idx) => (
                      <div
                        key={topic.name}
                        className="flex items-center justify-between rounded-md border border-border/60 bg-card/60 px-3 py-2"
                        onClick={() => {
                          const search = buildRangeParams();
                          search.set("topic", topic.name);
                          navigate(`/publications?${search.toString()}`);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <span className="text-muted-foreground">{idx + 1}.</span>
                          <span className="truncate text-primary hover:underline" title={topic.name}>
                            {topic.name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {topic.count.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              {sortedTopTopics.length > INITIAL_TOPICS_LIMIT && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground shadow hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() =>
                      setTopicLimit((prev) => Math.min(prev + TOPICS_STEP, sortedTopTopics.length))
                    }
                    disabled={!hasMoreTopics}
                  >
                    Load more
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground shadow hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setTopicLimit(sortedTopTopics.length)}
                    disabled={!hasMoreTopics}
                  >
                    Load all
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
};

export default Index;
