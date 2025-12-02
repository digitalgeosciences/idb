import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, Users, Award, ArrowUpDown, Tags, Building2, FileText } from "lucide-react";
import { authors } from "@/data/authors.generated";
import { groups } from "@/data/groups.generated";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { SiteShell } from "@/components/SiteShell";
import { ProgramImpactCharts } from "@/components/ProgramImpactCharts";
import { programImpactByYear } from "@/data/programImpactByYear.generated";
import { programTopicsInstitutionsByYear } from "@/data/programTopicsInstitutions.generated";
import { worksTable } from "@/data/worksTable.generated";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const SimpleProgramTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null;

  const first = payload[0];
  const data = first.payload as { program?: string } | undefined;
  const label = data?.program ?? first.name ?? "";
  const rawValue = first.value;

  if (rawValue == null) return null;

  const value =
    typeof rawValue === "number" ? rawValue.toLocaleString() : String(rawValue);

  return (
    <div className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-sm">
      <div className="font-semibold">{label}</div>
      <div>{value}</div>
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const assetBase =
    typeof import.meta.env.BASE_URL === "string" ? import.meta.env.BASE_URL : "/";
  const programIconSrc = `${assetBase.replace(/\/$/, "/")}icon.png`;

  const validGroups = groups.filter((group) => group.groupId && group.name);

  const metricsByGroup = useMemo(() => {
    const map = new Map<
      string,
      { members: number; publications: number; citations: number }
    >();

    // Members per group from authors.csv
    for (const author of authors) {
      const key = author.groupId;
      if (!key) continue;
      const current = map.get(key) ?? {
        members: 0,
        publications: 0,
        citations: 0,
      };
      current.members += 1;
      map.set(key, current);
    }

    // Publications and citations per group from worksTable
    for (const work of worksTable) {
      const key = work.program;
      if (!key) continue;
      const current = map.get(key) ?? {
        members: 0,
        publications: 0,
        citations: 0,
      };
      current.publications += 1;
      current.citations += work.citations ?? 0;
      map.set(key, current);
    }

    return map;
  }, []);

  const totalGroups = validGroups.length;
  const totals = Array.from(metricsByGroup.values()).reduce(
    (acc, m) => ({
      members: acc.members + m.members,
      publications: acc.publications + m.publications,
      citations: acc.citations + m.citations,
    }),
    { members: 0, publications: 0, citations: 0 },
  );

  const totalsFromImpact = useMemo(
    () =>
      programImpactByYear.reduce(
        (acc, row) => ({
          publications: acc.publications + row.publications,
          citations: acc.citations + row.citations,
        }),
        { publications: 0, citations: 0 },
      ),
    [],
  );

  const totalsByYear = useMemo(() => {
    const map = new Map<number, { publications: number; citations: number }>();
    for (const row of programImpactByYear) {
      const current = map.get(row.year) ?? { publications: 0, citations: 0 };
      current.publications += row.publications;
      current.citations += row.citations;
      map.set(row.year, current);
    }
    return map;
  }, []);

  const allYears = useMemo(() => {
    const years = new Set<number>();
    for (const row of programImpactByYear) {
      years.add(row.year);
    }
    return Array.from(years).sort((a, b) => a - b);
  }, []);

  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);
  const [compareYears, setCompareYears] = useState<number>(1);
  const [impactScale, setImpactScale] = useState<"linear" | "log">("linear");
  const [topicsMetric, setTopicsMetric] = useState<"topics" | "institutions">("topics");

  useEffect(() => {
    if (!allYears.length) return;
    const minYear = allYears[0];
    setStartYear((prev) => (prev == null ? minYear : prev));
    setEndYear((prev) => (prev == null ? allYears[allYears.length - 1] : prev));
  }, [allYears]);


  const handleStartYearChange = (value: number) => {
    setStartYear(value);
    if (endYear != null && value > endYear) {
      setEndYear(value);
    }
  };

  const handleEndYearChange = (value: number) => {
    setEndYear(value);
    if (startYear != null && value < startYear) {
      setStartYear(value);
    }
  };

  const rangeMetricsByProgram = useMemo(() => {
    const map = new Map<string, { publications: number; citations: number }>();
    if (!allYears.length) return map;
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];

    for (const row of programImpactByYear) {
      if (row.year < from || row.year > to) continue;
      const key = row.program;
      const current = map.get(key) ?? { publications: 0, citations: 0 };
      current.publications += row.publications;
      current.citations += row.citations;
      map.set(key, current);
    }

    return map;
  }, [startYear, endYear, allYears]);

  const publicationTrend = useMemo(() => {
    if (!allYears.length) return undefined;
    if (allYears.length < 2) return undefined;
    const latestYear = allYears[allYears.length - 1];
    const previousYear = allYears[allYears.length - 2];
    const latest = totalsByYear.get(latestYear);
    const previous = totalsByYear.get(previousYear);
    if (!latest || !previous || previous.publications === 0) return undefined;
    const delta = ((latest.publications - previous.publications) / previous.publications) * 100;
    return {
      value: Math.round(Math.abs(delta)),
      isPositive: delta >= 0,
    };
  }, [allYears, totalsByYear]);

  const citationTrend = useMemo(() => {
    if (!allYears.length) return undefined;
    if (allYears.length < 2) return undefined;
    const latestYear = allYears[allYears.length - 1];
    const previousYear = allYears[allYears.length - 2];
    const latest = totalsByYear.get(latestYear);
    const previous = totalsByYear.get(previousYear);
    if (!latest || !previous || previous.citations === 0) return undefined;
    const delta = ((latest.citations - previous.citations) / previous.citations) * 100;
    return {
      value: Math.round(Math.abs(delta)),
      isPositive: delta >= 0,
    };
  }, [allYears, totalsByYear]);

  const totalsFromImpactInRange = useMemo(() => {
    if (!allYears.length) return { publications: 0, citations: 0 };
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];

    return programImpactByYear.reduce(
      (acc, row) => {
        if (row.year < from || row.year > to) return acc;
        return {
          publications: acc.publications + row.publications,
          citations: acc.citations + row.citations,
        };
      },
      { publications: 0, citations: 0 },
    );
  }, [allYears, startYear, endYear]);

  const latestYear = useMemo(() => {
    if (!allYears.length) return null;
    return allYears[allYears.length - 1];
  }, [allYears]);

  // For summary comparisons we always use the latest year,
  // independent of the selected year range.
  const currentYear = latestYear;

  const currentYearTotals = useMemo(() => {
    if (currentYear == null) return { publications: 0, citations: 0 };
    return totalsByYear.get(currentYear) ?? { publications: 0, citations: 0 };
  }, [currentYear, totalsByYear]);

  const currentYearTopics = useMemo(() => {
    if (currentYear == null) return 0;
    return programTopicsInstitutionsByYear.reduce((sum, row) => {
      if (row.year !== currentYear) return sum;
      return sum + (row.worksWithTopics || 0);
    }, 0);
  }, [currentYear]);

  const currentYearInstitutions = useMemo(() => {
    if (currentYear == null) return 0;
    return programTopicsInstitutionsByYear.reduce((sum, row) => {
      if (row.year !== currentYear) return sum;
      return sum + (row.institutionLinks || 0);
    }, 0);
  }, [currentYear]);

  const comparisonYear = useMemo(() => {
    if (latestYear == null || !allYears.length || compareYears <= 0) return null;
    const target = latestYear - compareYears;
    return allYears.includes(target) ? target : null;
  }, [allYears, latestYear, compareYears]);

  const previousYearTotals = useMemo(() => {
    if (comparisonYear == null) return { publications: 0, citations: 0 };
    return totalsByYear.get(comparisonYear) ?? { publications: 0, citations: 0 };
  }, [comparisonYear, totalsByYear]);

  const previousYearTopics = useMemo(() => {
    if (comparisonYear == null) return 0;
    return programTopicsInstitutionsByYear.reduce((sum, row) => {
      if (row.year !== comparisonYear) return sum;
      return sum + (row.worksWithTopics || 0);
    }, 0);
  }, [comparisonYear]);

  const previousYearInstitutions = useMemo(() => {
    if (comparisonYear == null) return 0;
    return programTopicsInstitutionsByYear.reduce((sum, row) => {
      if (row.year !== comparisonYear) return sum;
      return sum + (row.institutionLinks || 0);
    }, 0);
  }, [comparisonYear]);

  const getChangePercent = (current: number, previous: number) => {
    if (!previous || previous <= 0) return null;
    const raw = ((current - previous) / previous) * 100;
    if (!Number.isFinite(raw)) return null;
    return Math.round(raw);
  };

  const topicsChangePct = getChangePercent(currentYearTopics, previousYearTopics);
  const institutionsChangePct = getChangePercent(
    currentYearInstitutions,
    previousYearInstitutions,
  );
  const publicationsChangePct = getChangePercent(
    currentYearTotals.publications,
    previousYearTotals.publications,
  );
  const citationsChangePct = getChangePercent(
    currentYearTotals.citations,
    previousYearTotals.citations,
  );

  const totalTopics = useMemo(() => {
    if (!allYears.length) return 0;
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];

    return programTopicsInstitutionsByYear.reduce((sum, row) => {
      if (row.year < from || row.year > to) return sum;
      return sum + (row.worksWithTopics || 0);
    }, 0);
  }, [allYears, startYear, endYear]);

  const totalInstitutions = useMemo(() => {
    if (!allYears.length) return 0;
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];

    return programTopicsInstitutionsByYear.reduce((sum, row) => {
      if (row.year < from || row.year > to) return sum;
      return sum + (row.institutionLinks || 0);
    }, 0);
  }, [allYears, startYear, endYear]);

  const topicsByProgram = useMemo(() => {
    if (!allYears.length) {
      return validGroups.map((group) => ({
        program: group.shortName || group.groupId,
        name: group.name,
        topics: 0,
      }));
    }

    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];

    const byProgram = new Map<string, number>();

    for (const row of programTopicsInstitutionsByYear) {
      if (row.year < from || row.year > to) continue;
      const current = byProgram.get(row.program) ?? 0;
      byProgram.set(row.program, current + (row.worksWithTopics || 0));
    }

    return validGroups.map((group) => {
      const programCode = group.shortName || group.groupId;
      return {
        program: programCode,
        name: group.name,
        topics: byProgram.get(programCode) ?? 0,
      };
    });
  }, [validGroups, allYears, startYear, endYear]);

  const institutionsByProgram = useMemo(() => {
    if (!allYears.length) {
      return validGroups.map((group) => ({
        program: group.shortName || group.groupId,
        name: group.name,
        institutions: 0,
      }));
    }

    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];

    const byProgram = new Map<string, number>();

    for (const row of programTopicsInstitutionsByYear) {
      if (row.year < from || row.year > to) continue;
      const current = byProgram.get(row.program) ?? 0;
      byProgram.set(row.program, current + (row.institutionLinks || 0));
    }

    return validGroups.map((group) => {
      const programCode = group.shortName || group.groupId;
      return {
        program: programCode,
        name: group.name,
        institutions: byProgram.get(programCode) ?? 0,
      };
    });
  }, [validGroups, allYears, startYear, endYear]);

  const topicsInstitutionsChartData = useMemo(
    () =>
      topicsByProgram.map((row) => {
        const instRow = institutionsByProgram.find(
          (candidate) => candidate.program === row.program,
        );
        return {
          program: row.program,
          name: row.name,
          topics: row.topics,
          institutions: instRow ? instRow.institutions : 0,
        };
      }),
    [topicsByProgram, institutionsByProgram],
  );

  const allPositiveTopics = topicsInstitutionsChartData.every((row) => row.topics > 0);
  const allPositiveInstitutions = topicsInstitutionsChartData.every(
    (row) => row.institutions > 0,
  );

  const programRows = useMemo(() => {
    return validGroups.map((group) => {
      const baseMetrics = metricsByGroup.get(group.groupId) ?? {
        members: 0,
        publications: 0,
        citations: 0,
      };
      const programCode = group.shortName || group.groupId;
      const rangeStats = rangeMetricsByProgram.get(programCode);
      const topicsStats = topicsByProgram.find(
        (row) => row.program === programCode,
      );
      const institutionsStats = institutionsByProgram.find(
        (row) => row.program === programCode,
      );
      return {
        group,
        members: baseMetrics.members,
        publications: rangeStats ? rangeStats.publications : baseMetrics.publications,
        citations: rangeStats ? rangeStats.citations : baseMetrics.citations,
        themes: topicsStats ? topicsStats.topics : 0,
        areas: institutionsStats ? institutionsStats.institutions : 0,
      };
    });
  }, [validGroups, metricsByGroup, rangeMetricsByProgram, topicsByProgram, institutionsByProgram]);

  const [sortBy, setSortBy] = useState<
    "program" | "members" | "publications" | "themes" | "areas" | "citations"
  >("citations");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [programSearch, setProgramSearch] = useState("");

  const normalizedProgramSearch = programSearch.trim().toLowerCase();

  const filteredProgramRows = useMemo(() => {
    if (!normalizedProgramSearch) return programRows;
    const tokens = normalizedProgramSearch.split(/\s+/).filter(Boolean);
    if (!tokens.length) return programRows;
    return programRows.filter(({ group }) => {
      const haystack = [
        group.name,
        group.shortName,
        group.affiliationName,
        group.affiliationShort,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [programRows, normalizedProgramSearch]);

  const sortedProgramRows = useMemo(() => {
    const rows = [...filteredProgramRows];
    rows.sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;
      switch (sortBy) {
        case "members":
          return (a.members - b.members) * dir;
        case "publications":
          return (a.publications - b.publications) * dir;
        case "themes":
          return (a.themes - b.themes) * dir;
        case "areas":
          return (a.areas - b.areas) * dir;
        case "citations":
          return (a.citations - b.citations) * dir;
        case "program":
        default:
          return a.group.name.localeCompare(b.group.name) * dir;
      }
    });
    return rows;
  }, [filteredProgramRows, sortBy, sortOrder]);

  const toggleSort = (
    field: "program" | "members" | "publications" | "themes" | "areas" | "citations",
  ) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "program" ? "asc" : "desc");
    }
  };

  return (
    <SiteShell>
      <main className="container mx-auto px-4 py-4 sm:py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-6 text-xs sm:text-sm">
          <StatCard
            title="Programs"
            value={<span title={totalGroups.toLocaleString()}>{totalGroups}</span>}
            icon={Users}
            onClick={() => {
              const el = document.getElementById("research-programs");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          />
          <StatCard
            title="Members"
            value={
              <span title={totals.members.toLocaleString()}>
                {totals.members.toLocaleString()}
              </span>
            }
            icon={Users}
            onClick={() => navigate("/members")}
          />
        <StatCard
          title="Topics"
          value={
            (() => {
              const n = totalTopics;
              const abs = Math.abs(n);
              let display = n.toLocaleString();
              if (abs >= 1_000_000) {
                display = `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
              } else if (abs >= 1_000) {
                display = `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
              }
              return <span title={n.toLocaleString()}>{display}</span>;
            })()
          }
          icon={TrendingUp}
          subtitle={
            currentYear != null ? (
              <>
                <div>
                  <span
                    className="text-emerald-600 font-semibold"
                    title={`${currentYearTopics.toLocaleString()} in ${currentYear}`}
                  >
                    {currentYearTopics.toLocaleString()}
                    <span aria-hidden className="ml-0.5">{`\u2022`}</span>
                  </span>
                </div>
                {topicsChangePct != null && comparisonYear != null && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    <span
                      className={
                        topicsChangePct >= 0 ? "text-emerald-600" : "text-red-600"
                      }
                      title={`${topicsChangePct >= 0 ? "+" : ""}${Math.abs(
                        topicsChangePct,
                      )}% vs ${comparisonYear}${
                        compareYears > 1 ? ` (${compareYears}y)` : ""
                      }`}
                    >
                      {topicsChangePct >= 0 ? "+" : ""}
                      {Math.abs(topicsChangePct)}%
                      <span aria-hidden className="ml-0.5">{`\u0394`}</span>
                    </span>
                  </div>
                )}
              </>
            ) : undefined
          }
          onClick={() => navigate("/topics")}
        />

        <StatCard
          title="Institutions"
          value={
            (() => {
              const n = totalInstitutions;
              const abs = Math.abs(n);
              let display = n.toLocaleString();
              if (abs >= 1_000_000) {
                display = `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
              } else if (abs >= 1_000) {
                display = `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
              }
              return <span title={n.toLocaleString()}>{display}</span>;
            })()
          }
          icon={TrendingUp}
          subtitle={
            currentYear != null ? (
              <>
                <div>
                  <span
                    className="text-emerald-600 font-semibold"
                    title={`${currentYearInstitutions.toLocaleString()} in ${currentYear}`}
                  >
                    {currentYearInstitutions.toLocaleString()}
                    <span aria-hidden className="ml-0.5">{`\u2022`}</span>
                  </span>
                </div>
                {institutionsChangePct != null && comparisonYear != null && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    <span
                      className={
                        institutionsChangePct >= 0 ? "text-emerald-600" : "text-red-600"
                      }
                      title={`${institutionsChangePct >= 0 ? "+" : ""}${Math.abs(
                        institutionsChangePct,
                      )}% vs ${comparisonYear}${
                        compareYears > 1 ? ` (${compareYears}y)` : ""
                      }`}
                    >
                      {institutionsChangePct >= 0 ? "+" : ""}
                      {Math.abs(institutionsChangePct)}%
                      <span aria-hidden className="ml-0.5">{`\u0394`}</span>
                    </span>
                  </div>
                )}
              </>
            ) : undefined
          }
          onClick={() => navigate("/institutions")}
        />

        <StatCard
          title="Publications"
          value={
            (() => {
              const n = totalsFromImpactInRange.publications;
              const abs = Math.abs(n);
              let display = n.toLocaleString();
              if (abs >= 1_000_000) {
                display = `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
              } else if (abs >= 1_000) {
                display = `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
              }
              return <span title={n.toLocaleString()}>{display}</span>;
            })()
          }
          icon={TrendingUp}
          subtitle={
            currentYear != null ? (
              <>
                <div>
                  <span
                    className="text-emerald-600 font-semibold"
                    title={`${currentYearTotals.publications.toLocaleString()} in ${currentYear}`}
                  >
                    {currentYearTotals.publications.toLocaleString()}
                    <span aria-hidden className="ml-0.5">{`\u2022`}</span>
                  </span>
                </div>
                {publicationsChangePct != null && comparisonYear != null && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    <span
                      className={
                        publicationsChangePct >= 0 ? "text-emerald-600" : "text-red-600"
                      }
                      title={`${publicationsChangePct >= 0 ? "+" : ""}${Math.abs(
                        publicationsChangePct,
                      )}% vs ${comparisonYear}${
                        compareYears > 1 ? ` (${compareYears}y)` : ""
                      }`}
                    >
                      {publicationsChangePct >= 0 ? "+" : ""}
                      {Math.abs(publicationsChangePct)}%
                      <span aria-hidden className="ml-0.5">{`\u0394`}</span>
                    </span>
                  </div>
                )}
              </>
            ) : undefined
          }
          onClick={() => navigate("/publications")}
        />

        <StatCard
          title="Citations"
          value={
            (() => {
              const n = totalsFromImpactInRange.citations;
              const abs = Math.abs(n);
              let display = n.toLocaleString();
              if (abs >= 1_000_000) {
                display = `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
              } else if (abs >= 1_000) {
                display = `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
              }
              return <span title={n.toLocaleString()}>{display}</span>;
            })()
          }
          icon={Award}
          subtitle={
            currentYear != null ? (
              <>
                <div>
                  <span
                    className="text-emerald-600 font-semibold"
                    title={`${currentYearTotals.citations.toLocaleString()} in ${currentYear}`}
                  >
                    {currentYearTotals.citations.toLocaleString()}
                    <span aria-hidden className="ml-0.5">{`\u2022`}</span>
                  </span>
                </div>
                {citationsChangePct != null && comparisonYear != null && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    <span
                      className={
                        citationsChangePct >= 0 ? "text-emerald-600" : "text-red-600"
                      }
                      title={`${citationsChangePct >= 0 ? "+" : ""}${Math.abs(
                        citationsChangePct,
                      )}% vs ${comparisonYear}${
                        compareYears > 1 ? ` (${compareYears}y)` : ""
                      }`}
                    >
                      {citationsChangePct >= 0 ? "+" : ""}
                      {Math.abs(citationsChangePct)}%
                      <span aria-hidden className="ml-0.5">{`\u0394`}</span>
                    </span>
                  </div>
                )}
              </>
            ) : undefined
          }
          onClick={() => navigate("/citations")}
        />
        </div>

        {/* Program impact + topics / institutions charts */}
        <section id="topics-institutions" className="mb-10">
          <div className="mb-4 flex flex-col gap-2 text-xs text-muted-foreground">
            {/* Compare on its own row (top) */}
            <div className="flex items-center gap-1 justify-end">
              <span
                className="font-semibold text-foreground"
                title="Controls how many years back the percentage change is calculated (e.g., 1 = compare current year to previous year)."
              >
                Compare:
              </span>
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

            {/* Year range + Scale together below */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Year range:</span>
                <select
                  className="h-7 rounded border border-border bg-background px-2 text-xs"
                  value={startYear ?? ""}
                  onChange={(e) => handleStartYearChange(Number(e.target.value))}
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
                  onChange={(e) => handleEndYearChange(Number(e.target.value))}
                >
                  {allYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">Scale:</span>
                <div className="inline-flex rounded-md border border-border/60 overflow-hidden">
                  <Button
                    type="button"
                    variant={impactScale === "linear" ? "default" : "ghost"}
                    size="xs"
                    className="rounded-none px-2 py-1 text-xs"
                    onClick={() => setImpactScale("linear")}
                  >
                    Linear
                  </Button>
                  <Button
                    type="button"
                    variant={impactScale === "log" ? "default" : "ghost"}
                    size="xs"
                    className="rounded-none px-2 py-1 text-xs"
                    onClick={() => setImpactScale("log")}
                  >
                    Log
                  </Button>
                </div>
              </div>
            </div>
          </div>


          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ProgramImpactCharts
                data={validGroups.map((group) => {
                  const metrics = metricsByGroup.get(group.groupId) ?? {
                    members: 0,
                    publications: 0,
                    citations: 0,
                  };
                  return {
                    groupId: group.groupId,
                    name: group.name,
                    shortName: group.shortName,
                    members: metrics.members,
                    publications: metrics.publications,
                    citations: metrics.citations,
                  };
                })}
                startYear={startYear}
                endYear={endYear}
                scale={impactScale}
                onStartYearChange={handleStartYearChange}
                onEndYearChange={handleEndYearChange}
                onScaleChange={setImpactScale}
              />
            </div>
            <Card className="border-border/60">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span>Total</span>
                  <button
                    type="button"
                    onClick={() => setTopicsMetric("topics")}
                    className={`ml-1 px-3 py-1 text-sm font-semibold rounded-md border ${topicsMetric === "topics"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border"
                      }`}
                  >
                    Topics
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopicsMetric("institutions")}
                    className={`px-3 py-1 text-sm font-semibold rounded-md border ${topicsMetric === "institutions"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border"
                      }`}
                  >
                    Institutions
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] sm:h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topicsInstitutionsChartData} margin={{ left: -20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="program"
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
                        scale={
                          impactScale === "log" &&
                            (topicsMetric === "topics"
                              ? allPositiveTopics
                              : allPositiveInstitutions)
                            ? "log"
                            : "linear"
                        }
                        domain={
                          impactScale === "log" &&
                            (topicsMetric === "topics"
                              ? allPositiveTopics
                              : allPositiveInstitutions)
                            ? ["dataMin", "dataMax"]
                            : ["auto", "auto"]
                        }
                      />
                      <Tooltip content={<SimpleProgramTooltip />}
                      />
                      <Bar
                        dataKey={topicsMetric === "topics" ? "topics" : "institutions"}
                        fill={topicsMetric === "topics" ? "#22c55e" : "#7c3aed"}
                        name={
                          topicsMetric === "topics"
                            ? "Topics (works with topics)"
                            : "Distinct institutions"
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Research Programs Main Content */}
        <section id="research-programs" className="space-y-4 mb-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-foreground">Programs</h2>
            <div className="flex w-full flex-col gap-2 text-xs text-muted-foreground sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <div className="flex w-full items-center gap-2">
                <span className="font-semibold text-foreground">Search:</span>
                <Input
                  value={programSearch}
                  onChange={(e) => {
                    setProgramSearch(e.target.value);
                  }}
                  placeholder="Search programs or affiliations"
                  className="h-7 w-full text-xs sm:w-56"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground whitespace-nowrap">Year range:</span>
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
          <div className="hidden sm:block rounded-md border border-border/60 bg-card/40">
            <Table className="min-w-[720px] text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                      onClick={() => toggleSort("program")}
                    >
                      Program
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <span className="text-xs font-medium text-muted-foreground">
                      Short name
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="flex w-full items-center justify-end gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                      onClick={() => toggleSort("members")}
                    >
                      Members
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="flex w-full items-center justify-end gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                      onClick={() => toggleSort("publications")}
                    >
                      Publications
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="flex w-full items-center justify-end gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                      onClick={() => toggleSort("themes")}
                    >
                      Topics
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="flex w-full items-center justify-end gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                      onClick={() => toggleSort("areas")}
                    >
                      Institutions
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="flex w-full items-center justify-end gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                      onClick={() => toggleSort("citations")}
                    >
                      Total Citations
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProgramRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No programs match your search.
                    </TableCell>
                  </TableRow>
                )}
                {sortedProgramRows.map((row) => {
                  const { group, members, publications, citations, themes: themeCount, areas: areaCount } =
                    row;
                  const programCode = group.shortName || group.groupId;

                  return (
                    <TableRow
                      key={group.groupId}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => navigate(`/group/${group.groupId}`)}
                    >
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary/90 shadow-sm overflow-hidden"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/group/${group.groupId}`);
                            }}
                          >
                            <img
                              src={programIconSrc}
                              alt={`${group.shortName} icon`}
                              className="h-7 w-7"
                            />
                          </button>
                          <button
                            type="button"
                            className="text-left text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/group/${group.groupId}`);
                            }}
                          >
                            {group.name}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/group/${group.groupId}`);
                          }}
                        >
                          {group.shortName}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/members?program=${programCode}`);
                          }}
                        >
                          {members}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/publications?program=${programCode}`);
                          }}
                        >
                          {publications}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        {themeCount > 0 ? (
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/topics?program=${programCode}`);
                            }}
                          >
                            {themeCount}
                          </button>
                        ) : (
                          ""
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {areaCount > 0 ? (
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/institutions?program=${programCode}`);
                            }}
                          >
                            {areaCount}
                          </button>
                        ) : (
                          ""
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/publications?program=${programCode}`);
                          }}
                        >
                          {citations}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="grid grid-cols-2 gap-1 xs:grid-cols-2 sm:grid-cols-2 lg:hidden">
            {sortedProgramRows.length === 0 && (
              <div className="col-span-2 py-6 text-center text-muted-foreground">
                No programs match your search.
              </div>
            )}
            {sortedProgramRows.map((row) => {
              const {
                group,
                members,
                publications,
                citations,
                themes: themeCount,
                areas: areaCount,
              } = row;
              const programCode = group.shortName || group.groupId;

              return (
                <button
                  key={group.groupId}
                  type="button"
                  onClick={() => navigate(`/group/${group.groupId}`)}
                  className="w-full text-left rounded-md border border-border/60 bg-card/40 px-2 py-1 text-[11px]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground text-sm">
                      {programCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                    <div className="flex items-center justify-between gap-1" title="Members">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Members</span>
                      </div>
                      <span className="font-semibold">{members}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1" title="Publications">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Pubs</span>
                      </div>
                      <span className="font-semibold">{publications}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1" title="Topics">
                      <div className="flex items-center gap-1">
                        <Tags className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Topics</span>
                      </div>
                      <span className="font-semibold">{themeCount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1" title="Institutions">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Inst.</span>
                      </div>
                      <span className="font-semibold">{areaCount}</span>
                    </div>
                    <div
                      className="col-span-2 flex items-center justify-between gap-1"
                      title="Total citations"
                    >
                      <div className="flex items-center gap-1">
                        <Award className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Citations</span>
                      </div>
                      <span className="font-semibold">{citations}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

        </section>

      </main>
    </SiteShell>
  );
};
export default Index;
