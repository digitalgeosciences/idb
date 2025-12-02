import { Card } from "@/components/ui/card";
import { Users, FileText, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ResearchGroup {
  id: string;
  name: string;
  department: string;
  members: number;
  publications: number;
  totalCitations: number;
}

interface ResearchGroupCardProps {
  group: ResearchGroup;
}

export const ResearchGroupCard = ({ group }: ResearchGroupCardProps) => {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="p-6 transition-all hover:shadow-lg border-border/50 cursor-pointer hover:border-primary/30"
      onClick={() => navigate(`/group/${group.id}`)}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">{group.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{group.department}</p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
          <div className="flex flex-col items-center text-center">
            <Users className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{group.members}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <FileText className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{group.publications}</p>
            <p className="text-xs text-muted-foreground">Publications</p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <TrendingUp className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{group.totalCitations}</p>
            <p className="text-xs text-muted-foreground">Citations</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
