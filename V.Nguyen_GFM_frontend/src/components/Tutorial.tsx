import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/dialog";
import { Button } from "@/components/UI/button";
import {
  LayoutDashboard,
  FlaskConical,
  FileText,
  BookOpen,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tutorialSteps = [
  {
    title: "Welcome to GFM Platform",
    description:
      "---",
    icon: LayoutDashboard,
  },
  {
    title: "Dashboard Overview",
    description:
      "Your Dashboard shows an overview of your research activity including total runs, average confidence scores, recent results, and active jobs in progress.",
    icon: LayoutDashboard,
  },
  {
    title: "Run New Analyses",
    description:
      "Use the New Analysis page to submit DNA sequences, FASTA files, or genomic regions for AI-powered predictions. Select cell types and configure advanced options.",
    icon: FlaskConical,
  },
  {
    title: "View Results",
    description:
      "The Results page displays detailed prediction scores, confidence assessments, and evidence panels with links to external databases like UCSC and Ensembl.",
    icon: FileText,
  },
  {
    title: "Research Notebook",
    description:
      "Document your research in the Notebook with rich text, embedded result snapshots, and version history. All changes are tracked for reproducibility.",
    icon: BookOpen,
  },
  {
    title: "AI Assistant",
    description:
      "The AI Assistant panel on the right helps explain results, compare analyses, and answer questions about your genomic research. Ask anything!",
    icon: MessageSquare,
  },
];

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("gfm-tutorial-completed", "true");
    setCurrentStep(0);
    onOpenChange(false);
  };

  const handleSkip = () => {
    localStorage.setItem("gfm-tutorial-completed", "true");
    setCurrentStep(0);
    onOpenChange(false);
  };

  const step = tutorialSteps[currentStep];
  const StepIcon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <StepIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">{step.title}</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex justify-center gap-1.5 py-4">
          {tutorialSteps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentStep(index)}
              aria-label={`Go to step ${index + 1}`}
              className={cn(
                "h-2 rounded-full transition-all",
                index === currentStep
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted hover:bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div>
            {currentStep === 0 ? (
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tutorial
              </Button>
            ) : (
              <Button variant="outline" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <Button onClick={handleNext}>
            {currentStep === tutorialSteps.length - 1 ? (
              "Get Started"
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasCompletedTutorial = localStorage.getItem("gfm-tutorial-completed");
    if (!hasCompletedTutorial) {
      // Small delay for better UX
      const timer = setTimeout(() => setShowTutorial(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const openTutorial = () => setShowTutorial(true);

  return { showTutorial, setShowTutorial, openTutorial };
}
