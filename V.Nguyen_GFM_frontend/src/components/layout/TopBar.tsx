import { useState } from "react";
import { Badge } from "@/components/UI/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/UI/avatar";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/UI/tool";
import { Dna, Search, HelpCircle } from "lucide-react";
import { TutorialDialog, useTutorial } from "@/components/Tutorial";

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const { showTutorial, setShowTutorial, openTutorial } = useTutorial();

  return (
    <>
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-primary">
            <Dna className="h-6 w-6" />
            <span className="font-semibold text-lg">GFM Platform</span>
          </div>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm font-medium">Cancer Genomics Project</span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search analyses, results, notebooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-border"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={openTutorial}
                >
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open Tutorial</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Badge variant="secondary" className="font-mono text-xs">
            EPCOT v1.0
          </Badge>
          <Avatar className="h-8 w-8">
            <AvatarImage src="" alt="User" />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              DR
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <TutorialDialog open={showTutorial} onOpenChange={setShowTutorial} />
    </>
  );
}
