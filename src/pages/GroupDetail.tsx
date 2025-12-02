import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Users, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberCard } from "@/components/MemberCard";
import { ImpactMetrics } from "@/components/ImpactMetrics";
import { MetricsCharts } from "@/components/MetricsCharts";
import { PublicationTable } from "@/components/PublicationTable";
import { CollaborationNetwork } from "@/components/CollaborationNetwork";
import { ResearchTopics } from "@/components/ResearchTopics";
import {
  researchGroups,
  members,
  samplePublications,
  publicationsByYear,
  publicationTypes,
  topVenues,
  collaborations,
} from "@/data/sampleData";
import { SiteShell } from "@/components/SiteShell";

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const group = researchGroups.find(g => g.id === id);
  const groupMembers = members.filter(m => m.groupId === id);
  const groupPublications = samplePublications.filter(p => p.groupId === id);

  if (!group) {
    return (
      <SiteShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Group Not Found</h1>
            <Button onClick={() => navigate("/")}>Return to Dashboard</Button>
          </div>
        </div>
      </SiteShell>
    );
  }

  const yearData = publicationsByYear[id as keyof typeof publicationsByYear] || [];
  const typeData = publicationTypes[id as keyof typeof publicationTypes] || [];
  const venueData = topVenues[id as keyof typeof topVenues] || [];
  const collabData = collaborations[id as keyof typeof collaborations] || [];

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="bg-card border border-border/50 rounded-lg p-8 shadow-lg">
            <h1 className="text-4xl font-bold text-foreground mb-2">{group.name}</h1>
            <p className="text-lg text-muted-foreground mb-4">{group.department}</p>
            <p className="text-foreground max-w-3xl mb-6">{group.description}</p>
            
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Established:</span>{" "}
                  <span className="font-semibold text-foreground">{group.established}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Members:</span>{" "}
                  <span className="font-semibold text-foreground">{group.members}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Publications:</span>{" "}
                  <span className="font-semibold text-foreground">{group.publications}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  <span className="text-muted-foreground">h-index:</span>{" "}
                  <span className="font-semibold text-foreground">{group.hIndex}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Impact Metrics */}
        <div className="mb-8">
          <ImpactMetrics
            hIndex={group.hIndex}
            totalPublications={group.publications}
            totalCitations={group.totalCitations}
            publicationsWithData={groupPublications}
          />
        </div>

        {/* Research Topics */}
        <div className="mb-8 space-y-6">
          <ResearchTopics topics={group.researchAreas} />

          {Array.isArray(group.programs) && group.programs.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Programs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.programs.map((program) => (
                    <div
                      key={program.name}
                      className="flex flex-col rounded-lg border border-border/60 bg-card/60 px-4 py-3"
                    >
                      <span className="font-medium text-foreground">{program.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Program Lead: {program.programLead}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="publications">Publications</TabsTrigger>
            <TabsTrigger value="collaborations">Collaborations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <MetricsCharts
              publicationsByYear={yearData}
              publicationTypes={typeData}
              topVenues={venueData}
            />
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupMembers.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="publications" className="space-y-6">
            <PublicationTable 
              publications={groupPublications}
              groupMembers={groupMembers}
            />
          </TabsContent>

          <TabsContent value="collaborations" className="space-y-6">
            <CollaborationNetwork collaborations={collabData} />
          </TabsContent>
        </Tabs>
      </div>
    </SiteShell>
  );
}
