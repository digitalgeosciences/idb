import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Publication {
  id: string;
  title: string;
  authors: string[];
  year: number;
  citations: number;
  journal: string;
  type: string;
  doi?: string;
  keywords?: string[];
}

interface PublicationTableProps {
  publications: Publication[];
  groupMembers?: { name: string }[];
}

export const PublicationTable = ({ publications, groupMembers = [] }: PublicationTableProps) => {
  const PAGE_SIZE = 15;

  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"citations" | "year">("citations");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const memberNames = groupMembers.map(m => m.name);
  const years = Array.from(new Set(publications.map(p => p.year))).sort((a, b) => b - a);
  const types = Array.from(new Set(publications.map(p => p.type)));

  const filteredPubs = publications
    .filter(pub => {
      const matchesSearch = pub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           pub.authors.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesYear = yearFilter === "all" || pub.year === parseInt(yearFilter);
      const matchesType = typeFilter === "all" || pub.type === typeFilter;
      return matchesSearch && matchesYear && matchesType;
    })
    .sort((a, b) => {
      const multiplier = sortOrder === "asc" ? 1 : -1;
      return (a[sortBy] - b[sortBy]) * multiplier;
    });

  const visiblePublications = filteredPubs.slice(0, visibleCount);
  const hasMoreToShow = visibleCount < filteredPubs.length;

  const toggleSort = (field: "citations" | "year") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publications</CardTitle>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or author..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="pl-10"
            />
          </div>
          
          <Select
            value={yearFilter}
            onValueChange={(value) => {
              setYearFilter(value);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2 pb-2 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSort("citations")}
              className="text-xs"
            >
              Citations
              <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSort("year")}
              className="text-xs"
            >
              Year
              <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
          </div>

          {visiblePublications.map((pub) => (
            <div key={pub.id} className="p-4 border border-border/50 rounded-lg hover:border-primary/30 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-2">{pub.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {pub.authors.map((author, idx) => (
                      <span key={idx} className={memberNames.includes(author) ? "font-semibold text-primary" : ""}>
                        {author}{idx < pub.authors.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="outline" className="text-xs">{pub.type}</Badge>
                    <span className="text-xs text-muted-foreground">{pub.journal}</span>
                    {pub.keywords && pub.keywords.slice(0, 3).map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-bold text-primary">{pub.citations}</div>
                  <div className="text-xs text-muted-foreground">citations</div>
                  <div className="text-sm text-muted-foreground mt-1">{pub.year}</div>
                </div>
              </div>
            </div>
          ))}

          {filteredPubs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No publications found matching your filters.
            </div>
          )}

          {filteredPubs.length > 0 && (
            <div className="flex justify-center gap-2 pt-4">
              {hasMoreToShow && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredPubs.length))}
                >
                  Load more
                </Button>
              )}
              {hasMoreToShow && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisibleCount(filteredPubs.length)}
                >
                  Load all
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
