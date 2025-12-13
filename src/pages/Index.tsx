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
  const [compareYears, setCompareYears] = useState<number>(1);

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

  const totalsByYear = useMemo(() => {
    const map = new Map<number, { publications: number; citations: number }>();
    for (const [year, entry] of perYearAggregates.entries()) {
      map.set(year, { publications: entry.publications, citations: entry.citations });
    }
    return map;
  }, [perYearAggregates]);

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
    if (!allYears.length) return { total: 0, current: 0, previous: 0, currentYear: null as number | null, previousYear: null as number | null };
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];
    const currentYear = allYears[allYears.length - 1];
    const previousYear = currentYear - compareYears;

    const totalSet = new Set<string>();
    const currentSet = new Set<string>();
    const previousSet = new Set<string>();

    for (const [year, entry] of perYearAggregates.entries()) {
      if (year >= from && year <= to) {
        entry.topics.forEach((t) => totalSet.add(t));
      }
      if (year === currentYear) {
        entry.topics.forEach((t) => currentSet.add(t));
      }
      if (year === previousYear) {
        entry.topics.forEach((t) => previousSet.add(t));
      }
    }

    return {
      total: totalSet.size,
      current: currentSet.size,
      previous: previousSet.size,
      currentYear,
      previousYear,
    };
  }, [allYears, startYear, endYear, compareYears, perYearAggregates]);

  const institutionsTotals = useMemo(() => {
    if (!allYears.length) return { total: 0, current: 0, previous: 0, currentYear: null as number | null, previousYear: null as number | null };
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];
    const currentYear = allYears[allYears.length - 1];
    const previousYear = currentYear - compareYears;

    const totalSet = new Set<string>();
    const currentSet = new Set<string>();
    const previousSet = new Set<string>();

    for (const [year, entry] of perYearAggregates.entries()) {
      if (year >= from && year <= to) {
        entry.institutions.forEach((i) => totalSet.add(i));
      }
      if (year === currentYear) {
        entry.institutions.forEach((i) => currentSet.add(i));
      }
      if (year === previousYear) {
        entry.institutions.forEach((i) => previousSet.add(i));
      }
    }

    return {
      total: totalSet.size,
      current: currentSet.size,
      previous: previousSet.size,
      currentYear,
      previousYear,
    };
  }, [allYears, startYear, endYear, compareYears, perYearAggregates]);

  const latestYear = useMemo(() => {
    if (!allYears.length) return null;
    return allYears[allYears.length - 1];
  }, [allYears]);

  const comparisonYear = useMemo(() => {
    if (latestYear == null || !allYears.length || compareYears <= 0) return null;
    const target = latestYear - compareYears;
    return allYears.includes(target) ? target : null;
  }, [allYears, latestYear, compareYears]);

  const getChangePercent = (current: number, previous: number) => {
    if (!previous || previous <= 0) return null;
    const raw = ((current - previous) / previous) * 100;
    if (!Number.isFinite(raw)) return null;
    return Math.round(raw);
  };

  const publicationsChangePct = useMemo(() => {
    if (latestYear == null || comparisonYear == null) return null;
    const current = totalsByYear.get(latestYear)?.publications ?? 0;
    const previous = totalsByYear.get(comparisonYear)?.publications ?? 0;
    return getChangePercent(current, previous);
  }, [latestYear, comparisonYear, totalsByYear]);

  const citationsChangePct = useMemo(() => {
    if (latestYear == null || comparisonYear == null) return null;
    const current = totalsByYear.get(latestYear)?.citations ?? 0;
    const previous = totalsByYear.get(comparisonYear)?.citations ?? 0;
    return getChangePercent(current, previous);
  }, [latestYear, comparisonYear, totalsByYear]);

  const topicsChangePct = useMemo(
    () => getChangePercent(topicsTotals.current, topicsTotals.previous),
    [topicsTotals],
  );

  const institutionsChangePct = useMemo(
    () => getChangePercent(institutionsTotals.current, institutionsTotals.previous),
    [institutionsTotals],
  );

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

  const recentPublications = useMemo(() => {
    return [...cleanWorks]
      .sort((a, b) => {
        const aDate = a.publicationDate || `${a.year || 0}-01-01`;
        const bDate = b.publicationDate || `${b.year || 0}-01-01`;
        return bDate.localeCompare(aDate);
      })
      .slice(0, 9);
  }, [cleanWorks]);

  const topTopics = useMemo(() => {
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
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));
  }, [allYears, startYear, endYear, cleanWorks]);

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
        {dashboardConfig.showStats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-6 text-xs sm:text-sm">
            {dashboardConfig.statCards.members && (
              <StatCard
                title="Members"
                value={<span title={memberCount.toLocaleString()}>{memberCount}</span>}
                icon={Users}
                onClick={() => navigate("/members")}
              />
            )}
            {dashboardConfig.statCards.topics && (
              <StatCard
                title="Topics"
                value={<span title={topicsTotals.total.toLocaleString()}>{topicsTotals.total.toLocaleString()}</span>}
                icon={TrendingUp}
                subtitle={
                  topicsTotals.currentYear != null ? (
                    <>
                      <div className="text-emerald-600 font-semibold">
                        {topicsTotals.current.toLocaleString()}
                        <span aria-hidden className="ml-0.5">{"\u2022"}</span>
                      </div>
                      {topicsChangePct != null && topicsTotals.previousYear != null && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          <span
                            className={
                              topicsChangePct >= 0 ? "text-emerald-600" : "text-red-600"
                            }
                          >
                            {topicsChangePct >= 0 ? "+" : ""}
                            {Math.abs(topicsChangePct)}%
                            <span aria-hidden className="ml-0.5">{"\u0394"}</span>
                          </span>
                        </div>
                      )}
                    </>
                  ) : undefined
                }
                onClick={() => navigate("/topics")}
              />
            )}
            {dashboardConfig.statCards.institutions && (
              <StatCard
                title="Institutions"
                value={<span title={institutionsTotals.total.toLocaleString()}>{institutionsTotals.total.toLocaleString()}</span>}
                icon={TrendingUp}
                subtitle={
                  institutionsTotals.currentYear != null ? (
                    <>
                      <div className="text-emerald-600 font-semibold">
                        {institutionsTotals.current.toLocaleString()}
                        <span aria-hidden className="ml-0.5">{"\u2022"}</span>
                      </div>
                      {institutionsChangePct != null && institutionsTotals.previousYear != null && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          <span
                            className={
                              institutionsChangePct >= 0 ? "text-emerald-600" : "text-red-600"
                            }
                          >
                            {institutionsChangePct >= 0 ? "+" : ""}
                            {Math.abs(institutionsChangePct)}%
                            <span aria-hidden className="ml-0.5">{"\u0394"}</span>
                          </span>
                        </div>
                      )}
                    </>
                  ) : undefined
                }
                onClick={() => navigate("/institutions")}
              />
            )}
            {dashboardConfig.statCards.publications && (
              <StatCard
                title="Publications"
                value={<span title={totalPublicationsInRange.toLocaleString()}>{totalPublicationsInRange.toLocaleString()}</span>}
                icon={TrendingUp}
                subtitle={
                  latestYear != null ? (
                    <>
                      <div className="text-emerald-600 font-semibold">
                        {(totalsByYear.get(latestYear)?.publications ?? 0).toLocaleString()}
                        <span aria-hidden className="ml-0.5">{"\u2022"}</span>
                      </div>
                      {publicationsChangePct != null && comparisonYear != null && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          <span
                            className={
                              publicationsChangePct >= 0 ? "text-emerald-600" : "text-red-600"
                            }
                          >
                            {publicationsChangePct >= 0 ? "+" : ""}
                            {Math.abs(publicationsChangePct)}%
                            <span aria-hidden className="ml-0.5">{"\u0394"}</span>
                          </span>
                        </div>
                      )}
                    </>
                  ) : undefined
                }
                onClick={() => navigate("/publications")}
              />
            )}
            {dashboardConfig.statCards.citations && (
              <StatCard
                title="Citations"
                value={<span title={totalCitationsInRange.toLocaleString()}>{totalCitationsInRange.toLocaleString()}</span>}
                icon={Award}
                subtitle={
                  latestYear != null ? (
                    <>
                      <div className="text-emerald-600 font-semibold">
                        {(totalsByYear.get(latestYear)?.citations ?? 0).toLocaleString()}
                        <span aria-hidden className="ml-0.5">{"\u2022"}</span>
                      </div>
                      {citationsChangePct != null && comparisonYear != null && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          <span
                            className={
                              citationsChangePct >= 0 ? "text-emerald-600" : "text-red-600"
                            }
                          >
                            {citationsChangePct >= 0 ? "+" : ""}
                            {Math.abs(citationsChangePct)}%
                            <span aria-hidden className="ml-0.5">{"\u0394"}</span>
                          </span>
                        </div>
                      )}
                    </>
                  ) : undefined
                }
                onClick={() => navigate("/citations")}
              />
            )}
          </div>
        )}

        {/* Topic & institution trend (single chart) */}
        {dashboardConfig.showCharts && (
          <section className="mb-10">
            <div className="mb-4 flex flex-col gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 justify-end">
                <span className="font-semibold text-foreground">Compare:</span>
                <select
                  className="h-7 rounded border border-border bg-background px-2 text-xs"
                  value={compareYears}
                  onChange={(e) => setCompareYears(Number(e.target.value))}
                  title="Number of years back used when computing the change percentages in the summary cards."
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span>year(s)</span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Year range:</span>
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
                  <span>to</span>
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
            </div>

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
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Trending topics</h2>
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
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
};

export default Index;
