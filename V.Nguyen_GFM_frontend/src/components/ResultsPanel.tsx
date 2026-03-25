import { X, Download, BarChart2, TableIcon, CheckCircle, Clock, Dna } from "lucide-react";
import { Badge } from "@/components/UI/badge";
import { Button } from "@/components/UI/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/UI/card";

export interface JobMeta {
  filename: string;
  region: string;
  modality: string;
  timestamp: Date;
}

interface PredictionRow {
  locus: string;
  score: number;
  confidence: "High" | "Moderate" | "Low";
}

const PLACEHOLDER_ROWS: PredictionRow[] = [
  { locus: "chr17:41,196,312–41,204,991", score: 0.94, confidence: "High" },
  { locus: "chr17:41,205,001–41,208,200", score: 0.78, confidence: "Moderate" },
  { locus: "chr17:41,210,450–41,213,900", score: 0.61, confidence: "Moderate" },
  { locus: "chr17:41,215,100–41,216,800", score: 0.42, confidence: "Low" },
  { locus: "chr17:41,218,000–41,220,500", score: 0.88, confidence: "High" },
];

const confidenceBadgeVariant = (conf: PredictionRow["confidence"]) => {
  if (conf === "High") return "default";
  if (conf === "Moderate") return "secondary";
  return "outline";
};

const confidenceColor = (conf: PredictionRow["confidence"]) => {
  if (conf === "High") return "text-emerald-600 dark:text-emerald-400";
  if (conf === "Moderate") return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
};

interface ResultsPanelProps {
  jobMeta: JobMeta;
  onClose: () => void;
}

export function ResultsPanel({ jobMeta, onClose }: ResultsPanelProps) {
  const handleDownload = () => {
    const csv = [
      "Locus,Score,Confidence",
      ...PLACEHOLDER_ROWS.map((r) => `${r.locus},${r.score},${r.confidence}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prediction_${jobMeta.modality}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-background overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Dna className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm leading-tight">Prediction Results</h2>
            <p className="text-xs text-muted-foreground leading-tight">
              {jobMeta.filename} &middot; {jobMeta.region}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleDownload}
            aria-label="Download results as CSV"
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            aria-label="Close results panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Job meta strip */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1.5 font-normal">
            <CheckCircle className="h-3 w-3 text-emerald-500" />
            Completed
          </Badge>
          <Badge variant="outline" className="font-mono text-xs font-normal">
            {jobMeta.modality}
          </Badge>
          <Badge variant="outline" className="gap-1 font-normal text-xs">
            <Clock className="h-3 w-3" />
            {jobMeta.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Badge>
        </div>

        {/* Prediction table */}
        <Card className="bg-card/80">
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-primary" />
              Predicted Loci
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Locus</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Score</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {PLACEHOLDER_ROWS.map((row) => (
                  <tr key={row.locus} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-foreground">{row.locus}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{row.score.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-medium ${confidenceColor(row.confidence)}`}>
                        {row.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Visualization placeholder */}
        <Card className="bg-card/80">
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Signal Track Visualization
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-48 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/20 flex flex-col items-center justify-center gap-2">
              <BarChart2 className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Signal Track</p>
              <p className="text-xs text-muted-foreground/70">
                Visualization rendering — coming soon
              </p>
            </div>

            {/* Confidence distribution bar */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Confidence Distribution</p>
              <div className="flex rounded-full overflow-hidden h-2">
                <div className="bg-emerald-500 transition-all" style={{ width: "40%" }} title="High" />
                <div className="bg-amber-400 transition-all" style={{ width: "40%" }} title="Moderate" />
                <div className="bg-muted-foreground/30 transition-all" style={{ width: "20%" }} title="Low" />
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />High 40%</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />Moderate 40%</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />Low 20%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-sm text-foreground space-y-1">
            <p className="font-semibold text-primary">Summary</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              <span className="font-medium text-foreground">5 loci</span> identified across the queried region.{" "}
              <span className="font-medium text-foreground">2 high-confidence</span> peaks flagged for review.
              EPCOT model predictions are based on ATAC-seq signal patterns and regulatory context.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
