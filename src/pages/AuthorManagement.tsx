import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, Users, Building2 } from "lucide-react";
import { searchAuthors, getAuthorWorks, type OpenAlexAuthor } from "@/services/openAlex";
import { groups } from "@/data/groups.generated";
import { useToast } from "@/hooks/use-toast";
import { SiteShell } from "@/components/SiteShell";

export default function AuthorManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OpenAlexAuthor[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<Map<string, string>>(new Map());
  const [selectedAuthors, setSelectedAuthors] = useState<Map<string, string>>(new Map());
  const { toast } = useToast();

  const departments = Array.from(
    new Set(groups.map((g) => g.affiliationShort)),
  ).filter(Boolean);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchAuthors(searchQuery);
      setSearchResults(results);
      toast({
        title: "Search complete",
        description: `Found ${results.length} authors`,
      });
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Failed to search authors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssignDepartment = (authorId: string, department: string) => {
    setSelectedDepartments((prev) => {
      const next = new Map(prev);
      next.set(authorId, department);
      return next;
    });
    // Clear any previously selected group for this author when department changes
    setSelectedAuthors((prev) => {
      const next = new Map(prev);
      next.delete(authorId);
      return next;
    });
  };

  const handleAssignGroup = (authorId: string, groupId: string) => {
    setSelectedAuthors((prev) => {
      const next = new Map(prev);
      next.set(authorId, groupId);
      return next;
    });
    toast({
      title: "Author assigned",
      description: "Author has been assigned to the program",
    });
  };

  const handleImportAuthor = async (author: OpenAlexAuthor) => {
    const groupId = selectedAuthors.get(author.id);
    const department = selectedDepartments.get(author.id);

    if (!department) {
      toast({
        title: "Select a department",
        description: "Please select a department first",
        variant: "destructive",
      });
      return;
    }

    if (!groupId) {
      toast({
        title: "Select a program",
        description: "Please select a research program first",
        variant: "destructive",
      });
      return;
    }

    try {
      const works = await getAuthorWorks(author.id);
      
      // Store in localStorage for demo purposes
      const existingData = JSON.parse(localStorage.getItem('importedAuthors') || '[]');
      existingData.push({
        author,
        groupId,
        department,
        works,
        importedAt: new Date().toISOString(),
      });
      localStorage.setItem('importedAuthors', JSON.stringify(existingData));
      
      toast({
        title: "Import successful",
        description: `Imported ${author.display_name} with ${works.length} publications`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import author data",
        variant: "destructive",
      });
    }
  };

  return (
    <SiteShell>
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Author Management</h1>
            <p className="text-muted-foreground mt-2">
              Search and import authors from OpenAlex
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Search Authors
            </CardTitle>
            <CardDescription>
              Search for authors by name, ORCID, or affiliation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter author name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Search Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {searchResults.map((author) => (
                  <div
                    key={author.id}
                    className="border border-border rounded-lg p-4 space-y-3"
                  >
                    {(() => {
                      const selectedDepartment = selectedDepartments.get(author.id) || "";
                      const filteredGroups = selectedDepartment
                        ? groups.filter((g) => g.affiliationShort === selectedDepartment)
                        : [];

                      return (
                        <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground">
                          {author.display_name}
                        </h3>
                        {author.id && (
                          <a
                            href={author.id}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline"
                          >
                            View on OpenAlex
                          </a>
                        )}
                        {author.last_known_institution && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Building2 className="h-3 w-3" />
                            {author.last_known_institution.display_name}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">
                            {author.works_count} publications
                          </Badge>
                          <Badge variant="secondary">
                            {author.cited_by_count} citations
                          </Badge>
                          <Badge variant="secondary">h-index: {author.h_index}</Badge>
                          <Badge variant="secondary">i10: {author.i10_index}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={selectedDepartment}
                        onValueChange={(value) => handleAssignDepartment(author.id, value)}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((department) => (
                            <SelectItem key={department} value={department}>
                              {department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={selectedAuthors.get(author.id) || ""}
                        onValueChange={(value) => handleAssignGroup(author.id, value)}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredGroups.map((group) => (
                            <SelectItem key={group.groupId} value={group.groupId}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => handleImportAuthor(author)}
                        disabled={!selectedDepartment || !selectedAuthors.get(author.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Import Author
                      </Button>
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SiteShell>
  );
}
