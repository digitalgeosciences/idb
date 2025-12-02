import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  FileText,
  Award,
  ArrowUpDown,
  User,
  Tags,
  Building2,
  Download,
  Share2,
  Network,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { groups } from "@/data/groups.generated";
import { programTopicsInstitutionsByYear } from "@/data/programTopicsInstitutions.generated";
import { authors } from "@/data/authors.generated";
import { worksTable } from "@/data/worksTable.generated";
import { SiteShell } from "@/components/SiteShell";
import type { OpenAlexWork } from "@/services/openAlex";
import { dedupeWorks, normalizeOpenAlexId } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

type AuthorImpactStats = {
  publications: number;
  topics: number;
  institutions: number;
  citations: number;
  hIndex: number;
};

export default function ProgramDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const group = groups.find((g) => g.groupId === id);

  const programAuthors = useMemo(
    () => authors.filter((author) => author.groupId === id),
    [id],
  );

  const programWorks = useMemo(() => {
    if (!group) return [] as typeof worksTable;
    const code = group.groupId;
    return dedupeWorks(worksTable.filter((work) => work.program === code));
  }, [group]);

  const programAuthorIds = useMemo(
    () =>
      new Set(
        programAuthors
          .map((a) => normalizeOpenAlexId(a.openAlexId))
          .filter((v): v is string => !!v),
      ),
    [programAuthors],
  );

  const [sortBy, setSortBy] = useState<"citations" | "hIndex">("hIndex");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [works, setWorks] = useState<OpenAlexWork[]>([]);
  const [isLoadingWorks, setIsLoadingWorks] = useState(false);
  const [worksError, setWorksError] = useState<string | null>(null);



  useEffect(() => {
    if (!programAuthors.length) {
      setWorks([]);
      return;
    }

    const baseUrl =
      typeof import.meta.env.BASE_URL === "string" ? import.meta.env.BASE_URL : "/";

    let cancelled = false;

    const loadWorks = async () => {
      setIsLoadingWorks(true);
      setWorksError(null);
      try {
        const all: OpenAlexWork[] = [];
        for (const author of programAuthors) {
          if (!author.openAlexId) continue;
          try {
            const url = `${baseUrl.replace(/\/$/, "/")}author-data/${author.openAlexId}.json`;
            const res = await fetch(url);
            if (!res.ok) continue;
            const data: { works?: OpenAlexWork[] } = await res.json();
            if (data.works) all.push(...data.works);
          } catch {
            // ignore individual author errors
          }
        }
        if (!cancelled) {
          const byId = new Map<string, OpenAlexWork>();
          for (const work of all) {
            const key =
              (work.id as string | undefined) ||
              (work.doi as string | undefined) ||
              `${work.title ?? ""}-${work.publication_year ?? ""}`;
            if (!byId.has(key)) {
              byId.set(key, work);
            }
          }
          setWorks(Array.from(byId.values()));
        }
      } catch {
        if (!cancelled) {
          setWorksError("Failed to load publication history for this program.");
        }
      } finally {
        if (!cancelled) setIsLoadingWorks(false);
      }
    };

    loadWorks();

    return () => {
      cancelled = true;
    };
  }, [programAuthors]);

  const yearlyStats = useMemo(() => {
    const byYear = new Map<
      number,
      {
        year: number;
        publications: number;
        citations: number;
      }
    >();

    for (const work of works) {
      const year = work.publication_year;
      if (!year) continue;
      const existing = byYear.get(year) ?? { year, publications: 0, citations: 0 };
      existing.publications += 1;
      existing.citations += work.cited_by_count ?? 0;
      byYear.set(year, existing);
    }

    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [works]);

  const allYears = useMemo(() => yearlyStats.map((s) => s.year), [yearlyStats]);

  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);

  useEffect(() => {
    if (!allYears.length) return;
    const minYear = allYears[0];
    const maxYear = allYears[allYears.length - 1];

    setStartYear((prev) => (prev == null ? minYear : prev));
    setEndYear((prev) => (prev == null ? maxYear : prev));
  }, [allYears]);


  const filteredYearlyStats = useMemo(() => {
    if (!allYears.length) return yearlyStats;
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];
    return yearlyStats.filter((s) => s.year >= from && s.year <= to);
  }, [yearlyStats, allYears, startYear, endYear]);

  const totalPublications = useMemo(
    () => filteredYearlyStats.reduce((sum, row) => sum + (row.publications || 0), 0),
    [filteredYearlyStats],
  );

  const totalCitations = useMemo(
    () => filteredYearlyStats.reduce((sum, row) => sum + (row.citations || 0), 0),
    [filteredYearlyStats],
  );

  const programRangeSummary = useMemo(() => {
    if (!group) return { topics: 0, institutions: 0 };
    if (!allYears.length) return { topics: 0, institutions: 0 };

    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];
    const programCode = group.groupId;

    let topics = 0;
    let institutions = 0;

    for (const row of programTopicsInstitutionsByYear) {
      if (row.program !== programCode) continue;
      if (row.year < from || row.year > to) continue;
      topics += row.worksWithTopics || 0;
      institutions += row.institutionLinks || 0;
    }

    return { topics, institutions };
  }, [group, allYears, startYear, endYear]);


  const authorStatsByName = useMemo(() => {
    if (!group) return new Map<string, AuthorImpactStats>();
    if (!programAuthorIds.size) return new Map<string, AuthorImpactStats>();

    const aggregated = new Map<
      string,
      {
        publications: number;
        citationsList: number[];
        topics: Set<string>;
        institutions: Set<string>;
      }
    >();

    const from = startYear ?? undefined;
    const to = endYear ?? undefined;

    for (const work of programWorks) {
      if (!work.year) continue;
      if (from != null && work.year < from) continue;
      if (to != null && work.year > to) continue;

      const citations = work.citations ?? 0;
      const topics = Array.isArray(work.topics) ? work.topics : [];
      const institutions = Array.isArray(work.institutions)
        ? work.institutions
        : [];

      const topicNames = new Set<string>(topics);
      const instNames = new Set<string>(institutions);

      const authorIds = Array.from(
        new Set(
          (work.allAuthorOpenAlexIds || [])
            .map((value) => normalizeOpenAlexId(value))
            .filter((value): value is string => !!value),
        ),
      );

      for (const authorId of authorIds) {
        if (!programAuthorIds.has(authorId)) continue;

        const current =
          aggregated.get(authorId) ?? {
            publications: 0,
            citationsList: [],
            topics: new Set<string>(),
            institutions: new Set<string>(),
          };

        current.publications += 1;
        current.citationsList.push(citations);
        topicNames.forEach((name) => current.topics.add(name));
        instNames.forEach((name) => current.institutions.add(name));

        aggregated.set(authorId, current);
      }
    }

    const result = new Map<string, AuthorImpactStats>();
    for (const [authorId, value] of aggregated) {
      const sortedCitations = [...value.citationsList].sort((a, b) => b - a);
      let h = 0;
      for (let i = 0; i < sortedCitations.length; i += 1) {
        if (sortedCitations[i] >= i + 1) h = i + 1;
        else break;
      }
      const totalCitations = value.citationsList.reduce((sum, c) => sum + c, 0);
      result.set(authorId, {
        publications: value.publications,
        topics: value.topics.size,
        institutions: value.institutions.size,
        citations: totalCitations,
        hIndex: h,
      });
    }

    return result;
  }, [group, programWorks, programAuthorIds, startYear, endYear]);

  const getAuthorStats = (openAlexId?: string | null) => {
    if (!openAlexId) return null;
    const normalized = normalizeOpenAlexId(openAlexId);
    if (!normalized) return null;
    return authorStatsByName.get(normalized) ?? null;
  };


  const sortedAuthors = useMemo(() => {
    const list = [...programAuthors];
    list.sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;

      const aStats = getAuthorStats(a.openAlexId);
      const bStats = getAuthorStats(b.openAlexId);

      const aCitations = aStats ? aStats.citations : a.totalCitations;
      const bCitations = bStats ? bStats.citations : b.totalCitations;
      const aH = aStats ? aStats.hIndex : a.hIndex;
      const bH = bStats ? bStats.hIndex : b.hIndex;

      if (sortBy === "citations") {
        return (aCitations - bCitations) * dir;
      }
      return (aH - bH) * dir;
    });
    return list;
  }, [programAuthors, sortBy, sortOrder, authorStatsByName]);


  const AUTHORS_PAGE_SIZE = 25;
  const [visibleAuthorCount, setVisibleAuthorCount] = useState(AUTHORS_PAGE_SIZE);

  useEffect(() => {
    setVisibleAuthorCount((current) =>
      sortedAuthors.length === 0
        ? 0
        : Math.min(current || AUTHORS_PAGE_SIZE, sortedAuthors.length, AUTHORS_PAGE_SIZE),
    );
  }, [sortedAuthors]);

  const visibleAuthors =
    visibleAuthorCount > 0
      ? sortedAuthors.slice(0, Math.min(visibleAuthorCount, sortedAuthors.length))
      : sortedAuthors;

  const hasMoreAuthors = visibleAuthorCount < sortedAuthors.length;

  const toggleSort = (field: "citations" | "hIndex") => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  if (!group) {
    return (
      <SiteShell>
        <main className="container mx-auto px-4 py-6 space-y-4">
          <p className="text-lg font-semibold text-foreground">Program not found</p>
        </main>
      </SiteShell>
    );
  }

  const handleSavePdf = () => {
    window.print();
  };

  const handleShareLinkedIn = () => {
    const url = window.location.href;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      url,
    )}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const handleExportCsv = () => {
    if (!filteredYearlyStats.length) return;

    const headers = ["year", "publications", "citations"];

    const escape = (value: unknown) => {
      const str = value == null ? "" : String(value);
      if (str === "") return "";
      const cleaned = str.replace(/\r?\n/g, " ");
      if (/[",]/.test(cleaned)) {
        return `"${cleaned.replace(/"/g, '""')}"`;
      }
      return cleaned;
    };

    const lines = [headers.join(",")];
    for (const row of filteredYearlyStats) {
      lines.push(
        [escape(row.year), escape(row.publications), escape(row.citations)].join(","),
      );
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${group.shortName || group.groupId || "program"}-impact-by-year.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAuthorsCsv = () => {
    const headers = [
      "author_name",
      "email",
      "program",
      "affiliations",
      "publications",
      "topics",
      "institutions",
      "total_citations",
      "h_index",
    ];

    const escape = (value: unknown) => {
      const str = value == null ? "" : String(value);
      if (str === "") return "";
      const cleaned = str.replace(/\r?\n/g, " ");
      if (/[",]/.test(cleaned)) {
        return `"${cleaned.replace(/"/g, '""')}"`;
      }
      return cleaned;
    };

    const lines = [headers.join(",")];

    for (const author of sortedAuthors) {
      const affiliates = [author.affiliate1, author.affiliate2, author.affiliate3]
        .filter(Boolean)
        .join(", ");

      const stats = getAuthorStats(author.openAlexId);

      lines.push(
        [
          escape(author.name),
          escape(author.email),
          escape(group.shortName || group.groupId || ""),
          escape(affiliates),
          escape(stats ? stats.publications : 0),
          escape(stats ? stats.topics : ""),
          escape(stats ? stats.institutions : ""),
          escape(stats ? stats.citations : 0),
          escape(stats ? stats.hIndex : author.hIndex),
        ].join(","),
      );
    }


    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${group.shortName || group.groupId || "program"}-authors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SiteShell>
      <main className="container mx-auto px-4 py-6 space-y-4">
        <Card className="border-border/60">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-fit px-2 text-xs"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back to dashboard
              </Button>
              <CardTitle className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground border border-border rounded-full px-3 py-1">
                  {group.shortName}
                </span>
                <span className="text-2xl font-bold text-foreground">{group.name}</span>
              </CardTitle>
            </div>

            <div className="flex flex-col items-end gap-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap gap-4 justify-end">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <Link
                    to={`/members?program=${encodeURIComponent(
                      group.shortName || group.groupId,
                    )}`}
                    className="text-left hover:underline decoration-dotted"
                  >
                    <span className="font-semibold text-foreground">
                      {programAuthors.length}
                    </span>{" "}
                    affiliates
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <Tags className="h-4 w-4 text-primary" />
                  <Link
                    to={`/topics?program=${encodeURIComponent(
                      group.shortName || group.groupId,
                    )}`}
                    className="text-left hover:underline decoration-dotted"
                  >
                    <span className="font-semibold text-foreground">
                      {programRangeSummary.topics}
                    </span>{" "}
                    topics
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <Link
                    to={`/institutions?program=${encodeURIComponent(
                      group.shortName || group.groupId,
                    )}`}
                    className="text-left hover:underline decoration-dotted"
                  >
                    <span className="font-semibold text-foreground">
                      {programRangeSummary.institutions}
                    </span>{" "}
                    institutions
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <Link
                    to={`/publications?program=${encodeURIComponent(
                      group.shortName || group.groupId,
                    )}`}
                    className="text-left hover:underline decoration-dotted"
                  >
                    <span className="font-semibold text-foreground">
                      {totalPublications}
                    </span>{" "}
                    publications
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  <Link
                    to={`/citations?program=${encodeURIComponent(
                      group.shortName || group.groupId,
                    )}`}
                    className="text-left hover:underline decoration-dotted"
                  >
                    <span className="font-semibold text-foreground">
                      {totalCitations}
                    </span>{" "}
                    citations
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleExportCsv}
                  title="Export impact CSV"
                >
                  <FileText className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleSavePdf}
                  title="Save PDF"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleShareLinkedIn}
                  title="Share on LinkedIn"
                >
                  <Share2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => navigate(`/group/${group.groupId}/network`)}
                  title="View program co-author network"
                >
                  <Network className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>

        </Card>

        {yearlyStats.length > 0 && (
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                <span>Program impact over time</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {worksError && (
                <p className="text-xs text-destructive">{worksError}</p>
              )}
              {!worksError && (
                <>
                  <div>
                    <div className="mb-2 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" />
                          <span>Publications</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />
                          <span>Citations</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredYearlyStats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="year"
                            stroke="hsl(var(--muted-foreground))"
                            tick={{
                              fill: "hsl(var(--muted-foreground))",
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            tick={{
                              fill: "hsl(var(--muted-foreground))",
                              fontSize: 11,
                            }}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "6px",
                            }}
                          />
                          <Bar
                            dataKey="publications"
                            fill="hsl(var(--accent))"
                            name="Publications"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={filteredYearlyStats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="year"
                            stroke="hsl(var(--muted-foreground))"
                            tick={{
                              fill: "hsl(var(--muted-foreground))",
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            tick={{
                              fill: "hsl(var(--muted-foreground))",
                              fontSize: 11,
                            }}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "6px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="citations"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            name="Citations"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-border/60">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              <span>Affiliated authors</span>
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {allYears.length > 0 && (
                <>
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
                </>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 ml-1"
                onClick={handleExportAuthorsCsv}
                title="Export authors CSV"
              >
                <FileText className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border/60 bg-card/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Author</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Program / Affiliation(s)
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-right">
                      Publications
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-right">
                      Topics
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-right">
                      Institutions
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-right">
                      <button
                        type="button"
                        className="flex w-full items-center justify-end gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                        onClick={() => toggleSort("citations")}
                      >
                        Total citations
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-right">
                      <button
                        type="button"
                        className="flex w-full items-center justify-end gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                        onClick={() => toggleSort("hIndex")}
                      >
                        h-index
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleAuthors.map((author) => {
                    const stats = getAuthorStats(author.openAlexId);
                    const publications = stats ? stats.publications : 0;
                    const topics = stats ? stats.topics : null;
                    const institutions = stats ? stats.institutions : null;
                    const citations = stats ? stats.citations : 0;
                    const hIndex = stats ? stats.hIndex : author.hIndex;


                    const affiliates = [
                      author.affiliate1,
                      author.affiliate2,
                      author.affiliate3,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <TableRow key={author.authorId}>
                        <TableCell className="align-top font-medium text-foreground">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              {author.openAlexId ? (
                                <button
                                  type="button"
                                  className="text-primary hover:underline"
                                  onClick={() => navigate(`/author/${author.openAlexId}`)}
                                >
                                  {author.name}
                                </button>
                              ) : (
                                author.name
                              )}
                            </div>

                            {/* Compact mobile line */}
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground md:hidden">
                              {(author.email || affiliates) && (
                                <span>
                                  {author.email || ""}
                                  {author.email && affiliates ? " • " : ""}
                                  {affiliates ? `${group.shortName} / ${affiliates}` : group.shortName}
                                </span>
                              )}
                              {!author.email && !affiliates && (
                                <span>{group.shortName}</span>
                              )}
                              <span>•</span>
                              <span>{publications ?? 0} publications</span>
                              <span>•</span>
                              <span>{citations} citations</span>
                              <span>•</span>
                              <span>h-index {hIndex}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Desktop-only cells */}
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {author.email || ""}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {group.shortName}
                          {affiliates ? ` / ${affiliates}` : ""}
                        </TableCell>

                        {/* Publications + author profile */}
                        <TableCell className="hidden md:table-cell text-right">
                          {author.openAlexId ? (
                            <button
                              type="button"
                              className="text-primary hover:underline"
                              onClick={() => navigate(`/author/${author.openAlexId}`)}
                            >
                              {publications ?? ""}
                            </button>
                          ) : (
                            publications ?? ""
                          )}
                        </TableCell>

                        {/* Topics + program topics page */}
                        <TableCell className="hidden md:table-cell text-right">
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => navigate(`/topics?program=${group.groupId}`)}
                          >
                            {topics != null ? topics : ""}
                          </button>
                        </TableCell>

                        {/* Institutions + program institutions page */}
                        <TableCell className="hidden md:table-cell text-right">
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => navigate(`/institutions?program=${group.groupId}`)}
                          >
                            {institutions != null ? institutions : ""}
                          </button>
                        </TableCell>

                        {/* Total citations + author profile */}
                        <TableCell className="hidden md:table-cell text-right">
                          {author.openAlexId ? (
                            <button
                              type="button"
                              className="text-primary hover:underline"
                              onClick={() => navigate(`/author/${author.openAlexId}`)}
                            >
                              {citations}
                            </button>
                          ) : (
                            citations
                          )}
                        </TableCell>

                        {/* h-index + author profile */}
                        <TableCell className="hidden md:table-cell text-right">
                          {author.openAlexId ? (
                            <button
                              type="button"
                              className="text-primary hover:underline"
                              onClick={() => navigate(`/author/${author.openAlexId}`)}
                            >
                              {hIndex}
                            </button>
                          ) : (
                            hIndex
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {programAuthors.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-6"
                      >
                        No affiliated authors found for this program.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {sortedAuthors.length > 0 && (
              <div className="flex justify-center gap-2 pt-4">
                {hasMoreAuthors && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setVisibleAuthorCount((count) =>
                        Math.min(
                          (count || 0) + AUTHORS_PAGE_SIZE,
                          sortedAuthors.length,
                        ),
                      )
                    }
                  >
                    Load more
                  </Button>
                )}
                {hasMoreAuthors && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleAuthorCount(sortedAuthors.length)}
                  >
                    Load all
                  </Button>
                )}
              </div>
            )}
          </CardContent>

        </Card>
      </main>
    </SiteShell>
  );
}
