import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users } from "lucide-react";

interface CollaborationNetworkProps {
  collaborations: { institution: string; count: number }[];
}

export const CollaborationNetwork = ({ collaborations }: CollaborationNetworkProps) => {
  const maxCount = Math.max(...collaborations.map(c => c.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          External Collaborations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {collaborations.map((collab, idx) => {
            const percentage = (collab.count / maxCount) * 100;
            
            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{collab.institution}</span>
                  </div>
                  <Badge variant="secondary">{collab.count} publications</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
