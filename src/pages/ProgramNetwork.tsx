import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Users, User, Download, Linkedin, Link as LinkIcon, Network, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteShell } from "@/components/SiteShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { OpenAlexWork } from "@/services/openAlex";
import { authors } from "@/data/authors.generated";
import { groups } from "@/data/groups.generated";
import { toast } from "@/components/ui/use-toast";

type CoAuthorRow = {
  id: string;
  name: string;
  institutions: string;
  jointPublications: number;
  totalCitations: number;
  hasProfile: boolean;
};

const normalizeOpenAlexId = (raw?: string | null) => {
  if (!raw) return "";
  const parts = String(raw).trim().split("/");
  return parts[parts.length - 1];
};

const normalizeName = (raw: string) => {
  if (!raw) return "";
  let s = raw.trim().toLowerCase();
  s = s.normalize("NFD").replace(/\p{M}+/gu, "");
  s = s.replace(/[\u2010-\u2015]/g, "-");
  s = s.replace(/[.,']/g, "");
  s = s.replace(/\s+/g, " ");
  return s;
};

  export default function ProgramNetwork() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [works, setWorks] = useState<OpenAlexWork[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "institutions" | "jointPublications" | "totalCitations">(
    "jointPublications",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(15);
  const [searchQuery, setSearchQuery] = useState("");

  const group = useMemo(() => groups.find((g) => g.groupId === id), [id]);

  const programAuthors = useMemo(
    () => authors.filter((author) => author.groupId === id && author.openAlexId),
    [id],
  );

  useEffect(() => {
    if (!programAuthors.length) {
      setWorks([]);
      return;
    }

    const baseUrl =
      typeof import.meta.env.BASE_URL === "string" ? import.meta.env.BASE_URL : "/";

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
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
          setWorks(all);
        }
      } catch {
        if (!cancelled) setError("Failed to load co-author data for this program.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [programAuthors]);

  const focalIds = useMemo(
    () => new Set(programAuthors.map((a) => a.openAlexId).filter(Boolean) as string[]),
    [programAuthors],
  );

  const allYears = useMemo(() => {
    const years = new Set<number>();
    for (const work of works) {
      if (work.publication_year) years.add(work.publication_year);
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [works]);

useEffect(() => {
  if (!allYears.length) return;
  const minYear = allYears[0];
  const maxYear = allYears[allYears.length - 1];

  setStartYear((prev) => (prev == null ? minYear : prev));
  setEndYear((prev) => (prev == null ? maxYear : prev));
}, [allYears]);


  const filteredWorks = useMemo(() => {
    if (!works.length) return [];
    if (!allYears.length) return works;

    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];

    return works.filter(
      (work) => (work.publication_year ?? 0) >= from && (work.publication_year ?? 0) <= to,
    );
  }, [works, allYears, startYear, endYear]);

  const coAuthors = useMemo<CoAuthorRow[]>(() => {
    if (!focalIds.size) return [];

    const byKey = new Map<string, CoAuthorRow>();

    for (const work of filteredWorks) {
        const authorships = work.authorships ?? [];
      const hasFocal = authorships.some((a) =>
        focalIds.has(normalizeOpenAlexId(a.author?.id)),
      );
      if (!hasFocal) continue;

      const yearCitations = work.cited_by_count ?? 0;

      for (const a of authorships) {
        const authorId = normalizeOpenAlexId(a.author?.id);
        if (!authorId || focalIds.has(authorId)) continue;

        const displayName = a.author?.display_name || authorId;
        const key = normalizeName(displayName);

        const local = authors.find(
          (auth) =>
            auth.openAlexId === authorId || normalizeName(auth.name) === key,
        );

        const name = local?.name || displayName;
        const institutions = (a.institutions ?? [])
          .map((inst) => inst.display_name)
          .filter(Boolean)
          .join(", ");

        const existing = byKey.get(key) ?? {
          id: local?.openAlexId || authorId,
          name,
          institutions: "",
          jointPublications: 0,
          totalCitations: 0,
          hasProfile: !!local,
        };

        existing.jointPublications += 1;
        existing.totalCitations += yearCitations;
        if (institutions) {
          const merged = new Set(
            `${existing.institutions}${
              existing.institutions && institutions ? ", " : ""
            }${institutions}`
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          );
          existing.institutions = Array.from(merged).join(", ");
          }

          byKey.set(key, existing);
        }
      }

      return Array.from(byKey.values());
    }, [filteredWorks, focalIds]);

    const totalCoAuthors = coAuthors.length;
    const totalJointPublications = coAuthors.reduce(
      (sum, row) => sum + row.jointPublications,
      0,
    );
    const totalCitations = coAuthors.reduce(
      (sum, row) => sum + row.totalCitations,
      0,
    );

  const filteredCoAuthors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return coAuthors;
    return coAuthors.filter((row) => {
      const haystack = `${row.name} ${row.institutions}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [coAuthors, searchQuery]);

  const sortedCoAuthors = useMemo(() => {
    const rows = [...filteredCoAuthors];
    const dir = sortOrder === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "institutions":
          return a.institutions.localeCompare(b.institutions) * dir;
        case "jointPublications":
          return (a.jointPublications - b.jointPublications) * dir;
        case "totalCitations":
          return (a.totalCitations - b.totalCitations) * dir;
        default:
          return 0;
      }
    });
      return rows;
    }, [filteredCoAuthors, sortBy, sortOrder]);

  useEffect(() => {
    setVisibleCount(15);
  }, [sortedCoAuthors]);

  const toggleSort = (
    field: CoAuthorRow["name"] | "institutions" | "jointPublications" | "totalCitations",
  ) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field as typeof sortBy);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  };

  const title = group?.name || id || "Program co-author network";

  const handleExportCsv = () => {
    if (!sortedCoAuthors.length) return;

    const lines: string[] = [
      "author_id,author_name,institutions,joint_publications,total_citations",
    ];
    sortedCoAuthors.forEach((row) => {
      const safeName = row.name.replace(/"/g, '""');
      const safeInst = row.institutions.replace(/"/g, '""');
      lines.push(
        `${row.id},"${safeName}","${safeInst}",${row.jointPublications},${row.totalCitations}`,
      );
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `program-coauthors-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareLinkedIn = () => {
    const url = window.location.href;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      url,
    )}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Program co-author table URL copied to clipboard.",
      });
    } catch {
      // ignore
    }
  };

  const visibleRows = sortedCoAuthors.slice(0, visibleCount);
  const hasMore = visibleCount < sortedCoAuthors.length;

    return (
      <SiteShell>
        <main className="container mx-auto px-4 py-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
            {group && (
              <Button
                variant="ghost"
                onClick={() => navigate(`/group/${group.groupId}`)}
                className="px-2 text-xs"
              >
                Back to program
              </Button>
            )}
          </div>
          <Card className="border-border/60">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold text-foreground">Program co-author summary</span>
                </CardTitle>
                {group && (
                  <p className="text-xs text-muted-foreground">
                    Program:{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => navigate(`/group/${group.groupId}`)}
                    >
                      {group.name}
                    </button>
                  </p>
                )}
                {coAuthors.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{totalCoAuthors}</span>{" "}
                    co-authors &middot;{" "}
                    <span className="font-semibold text-foreground">
                      {totalJointPublications}
                    </span>{" "}
                    joint publications &middot;{" "}
                    <span className="font-semibold text-foreground">{totalCitations}</span>{" "}
                    total citations
                  </p>
                )}
              </div>
              <div className="flex flex-col items-stretch gap-2 text-xs text-muted-foreground sm:items-end">
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
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search co-authors…"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setVisibleCount(15);
                      }}
                      className="h-8 pl-2 pr-2 text-xs w-40"
                    />
                  </div>
                  <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleExportCsv}
                  title="Export CSV"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleShareLinkedIn}
                  title="Share on LinkedIn"
                >
                  <Linkedin className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopyLink}
                  title="Copy link"
                >
                  <LinkIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Co-authors</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-xs text-muted-foreground">Loading co-author data…</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
            {!isLoading && !error && (
              <>
                <div className="overflow-x-auto rounded-md border border-border/60 bg-card/40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Co-author</TableHead>
                        <TableHead>Institutions</TableHead>
                        <TableHead className="text-right">Joint publications</TableHead>
                        <TableHead className="text-right">Total citations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                {row.hasProfile ? (
                                  <button
                                    type="button"
                                    className="text-primary hover:underline text-left"
                                    onClick={() => navigate(`/author/${row.id}`)}
                                  >
                                    {row.name}
                                  </button>
                                ) : (
                                  <span>{row.name}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {row.institutions}
                            </TableCell>
                            <TableCell className="text-right">
                              <button
                                type="button"
                                className="text-primary hover:underline"
                                onClick={() => {
                                  const search = new URLSearchParams();
                                  if (group?.groupId) search.set("program", group.groupId);
                                  if (row.name) search.set("author", row.name);
                                  if (startYear != null)
                                    search.set("fromYear", String(startYear));
                                  if (endYear != null) search.set("toYear", String(endYear));
                                  navigate(`/publications?${search.toString()}`);
                                }}
                              >
                                {row.jointPublications}
                              </button>
                            </TableCell>
                            <TableCell className="text-right">{row.totalCitations}</TableCell>
                          </TableRow>
                        ))}
                      {!visibleRows.length && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                            No co-authors found in the selected year range.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {hasMore && (
                  <div className="flex justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setVisibleCount((count) =>
                          Math.min(count + 15, sortedCoAuthors.length),
                        )
                      }
                    >
                      Load more
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleCount(sortedCoAuthors.length)}
                    >
                      Load all
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </SiteShell>
  );
}
