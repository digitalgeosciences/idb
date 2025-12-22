import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileText, ArrowUpDown, Download, Linkedin, Link as LinkIcon, User, Network, BarChart3, ArrowLeft, Award, Tags, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { OpenAlexAuthor } from "@/services/openAlex";
import { authors } from "@/data/authors.generated";
import { worksTable } from "@/data/worksTable.generated";
import { SiteShell } from "@/components/SiteShell";
import { toast } from "@/components/ui/use-toast";
import { dedupeWorks } from "@/lib/utils";
import { filterWorks } from "@/lib/blacklist";
import { repairUtf8 } from "@/lib/textRepair";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function AuthorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState<string>("");
  const PAGE_SIZE = 15;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortBy, setSortBy] = useState<"year" | "citations">("year");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [workSearch, setWorkSearch] = useState("");

  const renderWorkTitleHtml = (title: string | undefined) => (
    <span dangerouslySetInnerHTML={{ __html: title || "" }} />
  );

  const localAuthor = useMemo(() => {
    return authors.find(
      (a) =>
        a.authorId === id ||
        a.openAlexId === id ||
        (Array.isArray(a.openAlexIds) && a.openAlexIds.includes(id ?? "")),
    );
  }, [id]);

  useEffect(() => {
    if (id && localAuthor?.authorId && id !== localAuthor.authorId) {
      navigate(`/author/${localAuthor.authorId}`, { replace: true });
    }
  }, [id, localAuthor, navigate]);

  const name = displayName || localAuthor?.name || "Author details";

  const cleanWorksTable = useMemo(() => {
    return filterWorks(worksTable, localAuthor?.authorId);
  }, [localAuthor]);

  const authorWorks = useMemo(() => {
    const targetOpenAlexId = localAuthor?.openAlexId || id;
    if (!targetOpenAlexId) {
      return [] as (typeof worksTable)[number][];
    }

    return cleanWorksTable.filter((w) =>
      (w.allAuthorOpenAlexIds || []).includes(targetOpenAlexId),
    );
  }, [id, localAuthor, cleanWorksTable]);

  const uniqueAuthorWorks = useMemo(
    () => dedupeWorks(authorWorks),
    [authorWorks],
  );


  const yearlyStats = useMemo(() => {
    const byYear = new Map<
      number,
      {
        year: number;
        publications: number;
        citations: number;
      }
    >();

    for (const work of uniqueAuthorWorks) {
      const year = work.year;
      if (!year) continue;
      const existing = byYear.get(year) ?? { year, publications: 0, citations: 0 };
      existing.publications += 1;
      existing.citations += work.citations ?? 0;
      byYear.set(year, existing);
    }

    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [uniqueAuthorWorks]);

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

  const rangeFilteredWorks = useMemo(() => {
    if (!uniqueAuthorWorks.length) return [];
    if (!allYears.length) return uniqueAuthorWorks;
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];
    return uniqueAuthorWorks.filter((w) => {
      const year = w.year ?? 0;
      return year >= from && year <= to;
    });
  }, [uniqueAuthorWorks, allYears, startYear, endYear]);

  const filteredWorks = useMemo(() => {
    const query = workSearch.trim().toLowerCase();
    if (!query) return rangeFilteredWorks;
    const tokens = query.split(/\s+/).filter(Boolean);
    if (!tokens.length) return rangeFilteredWorks;

    return rangeFilteredWorks.filter((work) => {
      const plainTitle = (work.title || "").replace(/<[^>]+>/g, " ");
      const haystack = [
        plainTitle,
        (work.allAuthors || []).join(" "),
        work.venue || "",
        work.publicationDate || "",
        work.year != null ? String(work.year) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [rangeFilteredWorks, workSearch]);

  const summary = useMemo(() => {
    if (!id) {
      return {
        totalPublications: 0,
        totalCitations: 0,
        hIndex: 0,
        topics: 0,
        institutions: 0,
      };
    }

    const from = startYear;
    const to = endYear;

    const citationsList: number[] = [];
    let totalPublications = 0;
    const topicSet = new Set<string>();
    const institutionSet = new Set<string>();

    for (const w of uniqueAuthorWorks) {
      if (!w.year) continue;
      if (from != null && w.year < from) continue;
      if (to != null && w.year > to) continue;

      totalPublications += 1;
      citationsList.push(w.citations ?? 0);

      for (const t of w.topics || []) {
        if (t) topicSet.add(t);
      }
      for (const inst of w.institutions || []) {
        if (inst) institutionSet.add(inst);
      }
    }

    const totalCitations = citationsList.reduce((sum, c) => sum + c, 0);

    let hIndex = 0;
    const sorted = [...citationsList].sort((a, b) => b - a);
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i] >= i + 1) {
        hIndex = i + 1;
      } else {
        break;
      }
    }

    return {
      totalPublications,
      totalCitations,
      hIndex,
      topics: topicSet.size,
      institutions: institutionSet.size,
    };
  }, [id, uniqueAuthorWorks, startYear, endYear]);



  const buildAuthorPublicationsPath = () => {
    const search = new URLSearchParams();
    const authorName = localAuthor?.name;
    if (authorName) search.set("author", authorName);
    if (startYear != null) search.set("fromYear", String(startYear));
    if (endYear != null) search.set("toYear", String(endYear));
    return `/publications?${search.toString()}`;
  };

  const buildAuthorCitationsPath = () => {
    const search = new URLSearchParams();
    const authorName = localAuthor?.name;
    if (authorName) search.set("author", authorName);
    if (startYear != null) search.set("fromYear", String(startYear));
    if (endYear != null) search.set("toYear", String(endYear));
    return `/citations?${search.toString()}`;
  };

  const buildAuthorTopicsPath = () => {
    const search = new URLSearchParams();
    const authorName = localAuthor?.name;
    if (authorName) search.set("author", authorName);
    if (startYear != null) search.set("fromYear", String(startYear));
    if (endYear != null) search.set("toYear", String(endYear));
    return `/topics?${search.toString()}`;
  };

  const buildAuthorInstitutionsPath = () => {
    const search = new URLSearchParams();
    const authorName = localAuthor?.name;
    if (authorName) search.set("author", authorName);
    if (startYear != null) search.set("fromYear", String(startYear));
    if (endYear != null) search.set("toYear", String(endYear));
    return `/institutions?${search.toString()}`;
  };


  const getPublicationSortValue = useCallback((w: (typeof filteredWorks)[number]) => {
    if (w.publicationDate) {
      const t = Date.parse(w.publicationDate);
      if (!Number.isNaN(t)) return t;
    }
    return w.year ?? 0;
  }, []);

  const sortedWorks = useMemo(() => {
    const items = [...filteredWorks];
    items.sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "year") {
        return (getPublicationSortValue(a) - getPublicationSortValue(b)) * dir;
      }
      return ((a.citations ?? 0) - (b.citations ?? 0)) * dir;
    });
    return items;
  }, [filteredWorks, sortBy, sortOrder, getPublicationSortValue]);

  const visibleWorks = sortedWorks.slice(0, visibleCount || sortedWorks.length);
  const hasMoreToShow = visibleCount < filteredWorks.length;

  const toggleSort = (field: "year" | "citations") => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleSavePdf = () => {
    window.print();
  };


  const handleExportWorksCsv = () => {
    if (!sortedWorks.length) return;

    const clean = (value: unknown) => repairUtf8(value ?? "");

    const headers = ["title", "year", "venue", "citations", "citation_harvard"];

    const escape = (value: unknown) => {
      const str = clean(value);
      if (str === "") return "";
      const cleaned = str.replace(/\r?\n/g, " ");


      if (/[",]/.test(cleaned)) {
        return `"${cleaned.replace(/"/g, '""')}"`;
      }
      return cleaned;
    };

    const decodeHtmlEntities = (value: string) => {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = value;
      return textarea.value;
    };

    const exportYear = (work: (typeof worksTable)[number]) => {
      if (work.publicationDate) {
        const d = new Date(work.publicationDate);
        if (!Number.isNaN(d.getTime())) return d.getFullYear();
      }
      return work.year ?? "";
    };

    const formatHarvardCitation = (w: (typeof worksTable)[number]) => {
      const sanitizeText = (value: string) =>
        clean(value)
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const authors = (w.allAuthors || []).map((name) => sanitizeText(name));

      const formatInitials = (name: string) =>
        name
          .split(/[\s-]+/)
          .filter(Boolean)
          .map((part) => `${part[0]?.toUpperCase() || ""}.`)
          .join("");

      const formattedAuthors = authors
        .map((fullName) => {
          const parts = fullName.trim().split(/\s+/);
          if (!parts.length) return "";
          const last = parts.pop() || "";
          const initials = formatInitials(parts.join(" "));
          const cleanLast = last.replace(/[,]+/g, "");
          return initials ? `${cleanLast}, ${initials}` : cleanLast;
        })
        .filter(Boolean);

      let authorsPart = "";
      if (formattedAuthors.length === 1) {
        authorsPart = formattedAuthors[0];
      } else if (formattedAuthors.length === 2) {
        authorsPart = `${formattedAuthors[0]} and ${formattedAuthors[1]}`;
      } else if (formattedAuthors.length > 2) {
        authorsPart = `${formattedAuthors.slice(0, -1).join(", ")}, and ${
          formattedAuthors[formattedAuthors.length - 1]
        }`;
      }

      const titlePart = sanitizeText(decodeHtmlEntities(w.title || ""));
      const yearPart = exportYear(w);
      const venuePart = w.venue ? `${sanitizeText(w.venue)}.` : "";
      const doiPart = w.doi
        ? `doi:${clean(w.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`
        : "";

      return [
        authorsPart ? `${authorsPart},` : "",
        yearPart ? `${yearPart}.` : "",
        titlePart ? `${titlePart}.` : "",
        venuePart,
        doiPart,
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const lines = [headers.join(",")];
    for (const w of sortedWorks) {
      lines.push(
        [
          decodeHtmlEntities(clean(w.title || "")),
          exportYear(w),
          clean(w.venue || ""),
          w.citations ?? "",
          formatHarvardCitation({
            ...w,
            title: decodeHtmlEntities(clean(w.title || "")),
          }),
        ]
          .map(escape)
          .join(","),
      );
    }

    // Prepend BOM so Excel consistently opens the file as UTF-8
    const csv = `\uFEFF${lines.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${(localAuthor?.name || name).replace(/\s+/g, "_")}-works.csv`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareLinkedIn = () => {
    const url = window.location.href;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    const url = window.location.href;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied",
          description: "Author page URL copied to clipboard.",
        });
      }
    } catch {
      // Silent failure is acceptable here
    }
  };

  return (
    <SiteShell>
      <main className="container mx-auto px-4 py-6 space-y-4">
        <Card className="border-border/60">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit px-2 text-xs"
                  onClick={() => navigate("/")}
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Back to dashboard
                </Button>
              </div>
              <CardTitle className="flex items-center gap-2">

                <User className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">{name}</span>
              </CardTitle>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                {localAuthor?.email && (
                  <div>
                    <span className="font-semibold text-foreground">Email:</span>{" "}
                    <a href={`mailto:${localAuthor.email}`} className="text-primary underline">
                      {localAuthor.email}
                    </a>
                  </div>
                )}
              </div>

            </div>

            <div className="flex flex-col items-end gap-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>
                    <Link
                      to={buildAuthorPublicationsPath()}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {summary.totalPublications} publications
                    </Link>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-primary" />
                  <span>
                    <Link
                      to={buildAuthorCitationsPath()}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {summary.totalCitations} citations
                    </Link>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Tags className="h-4 w-4 text-primary" />
                  <span>
                    <Link
                      to={buildAuthorTopicsPath()}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {summary.topics} topics
                    </Link>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>
                    <Link
                      to={buildAuthorInstitutionsPath()}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {summary.institutions} institutions
                    </Link>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span>
                    <span className="font-semibold text-foreground">
                      {summary.hIndex}
                    </span>{" "}
                    h-index
                  </span>
                </div>
              </div>


              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleSavePdf}
                  title="Save PDF"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleExportWorksCsv}
                  title="Export CSV"
                >
                  <FileText className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleShareLinkedIn}
                  title="Share on LinkedIn"
                >
                  <Linkedin className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopyLink}
                  title="Copy link"
                >
                  <LinkIcon className="h-3 w-3" />
                </Button>
                {id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate(`/author/${id}/network`)}
                    title="View co-author network"
                  >
                    <Network className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

          </CardHeader>
        </Card>

        {yearlyStats.length > 0 && (
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span>Impact over time</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="mb-3 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-sm"
                        style={{ backgroundColor: "hsl(var(--accent))" }}
                        aria-hidden
                      />
                      <span className="text-foreground">Publications (bars)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full border-2"
                        style={{ borderColor: "hsl(var(--primary))" }}
                        aria-hidden
                      />
                      <span className="text-foreground">Citations (line)</span>
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
                      <Bar dataKey="publications" fill="hsl(var(--accent))" name="Publications" />
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
            </CardContent>
          </Card>
        )}

        <Card className="border-border/60">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Publications</span>
            </CardTitle>
            <Input
              value={workSearch}
              onChange={(e) => {
                setVisibleCount(PAGE_SIZE);
                setWorkSearch(e.target.value);
              }}
              placeholder="Search title, author, venue..."
              className="h-9 text-sm sm:w-72"
            />
          </CardHeader>
          <CardContent>
            <>
              <div className="overflow-x-auto rounded-md border border-border/60 bg-card/40">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell text-xs text-muted-foreground">
                        First author
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-right">
                        <button
                          type="button"
                          className="flex w-full items-center justify-end gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                          onClick={() => toggleSort("year")}
                        >
                          Year
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Venue
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-right">
                        <button
                          type="button"
                          className="flex w-full items-center justify-end gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                          onClick={() => toggleSort("citations")}
                        >
                          Citations
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleWorks.map((work) => {
                      const rawDoi = (work.doi || "").trim();
                      const cleanedDoi = rawDoi
                        .replace(/^https?:\/\/(www\.)?doi\.org\//i, "")
                        .replace(/^doi:/i, "")
                        .trim();
                      const doiUrl = cleanedDoi ? `https://doi.org/${cleanedDoi}` : "";

                      const allAuthorNames = work.allAuthors || [];
                      const firstAuthor = allAuthorNames[0] ?? "";
                      const otherAuthors = allAuthorNames.slice(1);
                      const firstAuthorLastName =
                        work.firstAuthorLastName ||
                        (firstAuthor
                          ? firstAuthor.split(/\s+/).filter(Boolean).slice(-1)[0]
                          : "");
                      const displayFirstAuthor =
                        firstAuthorLastName && otherAuthors.length > 0
                          ? `${firstAuthorLastName} et al.`
                          : firstAuthorLastName || firstAuthor;

                      const year = work.year ?? "";
                      const publicationDate = work.publicationDate || "";
                      const publicationDateLabel = (() => {
                        if (!publicationDate) return "";
                        const date = new Date(publicationDate);
                        if (!Number.isNaN(date.getTime())) {
                          return date.toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          });
                        }
                        return publicationDate;
                      })();
                      const venue = work.venue || "";
                      const citations = work.citations ?? 0;

                      return (
                        <TableRow key={work.workId}>
                          <TableCell className="align-top font-medium text-foreground">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-start gap-2">
                                <FileText className="mt-0.5 h-4 w-4 text-primary" />
                                {doiUrl ? (
                                  <a
                                    href={doiUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {renderWorkTitleHtml(work.title)}
                                  </a>
                                ) : (
                                  renderWorkTitleHtml(work.title)
                                )}
                              </div>

                              {/* Compact mobile line */}
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground md:hidden">
                                {venue && (
                                  <span className="font-semibold text-foreground">
                                    {venue}
                                  </span>
                                )}

                                {displayFirstAuthor && (
                                  <>
                                    <span>•</span>
                                    <span>{displayFirstAuthor}</span>
                                  </>
                                )}

                                {year && (
                                  <>
                                    <span>•</span>
                                    <span title={publicationDateLabel || undefined}>{year}</span>
                                  </>
                                )}

                                {typeof citations === "number" && citations > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{citations} citations</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Desktop-only columns */}
                          <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                            {displayFirstAuthor ? (
                              otherAuthors.length > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger className="underline decoration-dotted underline-offset-2">
                                    {displayFirstAuthor}
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs text-xs">
                                    <p className="font-semibold mb-1">Authors</p>
                                    <p>{[firstAuthor, ...otherAuthors].join(", ")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                displayFirstAuthor
                              )
                            ) : (
                              ""
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-right">
                            {year ? (
                              publicationDateLabel ? (
                                <Tooltip>
                                  <TooltipTrigger className="inline-flex justify-end text-right w-full">
                                    {year}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Published {publicationDateLabel}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                year
                              )
                            ) : (
                              ""
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {venue}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right">
                            {citations}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredWorks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          No publications found for this author in the selected range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredWorks.length > 0 && (
                <div className="flex justify-center gap-2 pt-4">
                  {hasMoreToShow && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setVisibleCount((count) =>
                          Math.min(count + PAGE_SIZE, filteredWorks.length),
                        )
                      }
                    >
                      Load more
                    </Button>
                  )}
                  {hasMoreToShow && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleCount(filteredWorks.length)}
                    >
                      Load all
                    </Button>
                  )}
                </div>
              )}
            </>
          </CardContent>

        </Card>
      </main>
    </SiteShell>
  );
}
