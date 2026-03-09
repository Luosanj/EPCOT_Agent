import { Badge } from "@/components/UI/badge";
import { Button } from "@/components/UI/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/UI/card";
import { ArrowUpRight, FlaskConical, LineChart, ShieldCheck, Sparkles } from "lucide-react";

export function Dashboard() {
  return (
    <div className="min-h-full p-6 space-y-6">
      <section className="relative overflow-hidden rounded-2xl border bg-card/70 p-6">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative">
          <Badge variant="secondary" className="mb-3">
            GFM • Research Hub
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
            AI-ready genomic analysis, organized and explainable.
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground">
            Launch new runs, monitor confidence scores, and review explainable summaries. Your
            AI assistant is ready on the right whenever you need a second opinion.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="gap-2">
              Start New Analysis
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="gap-2">
              Review Recent Results
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="bg-card/80">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Latest Run
            </CardTitle>
            <CardDescription>Breast cancer enhancer scan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold">0.92</span>
              <span className="text-xs text-muted-foreground">Confidence</span>
            </div>
            <p className="text-sm text-muted-foreground">
              1.4M loci screened, 248 high-signal peaks flagged for review.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4 text-primary" />
              Active Jobs
            </CardTitle>
            <CardDescription>Queued and running analyses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold">3</span>
              <span className="text-xs text-muted-foreground">In progress</span>
            </div>
            <p className="text-sm text-muted-foreground">
              ETA ranges 12–38 minutes based on current pipeline load.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4 text-primary" />
              Model Health
            </CardTitle>
            <CardDescription>Drift + calibration monitor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold">Stable</span>
              <span className="text-xs text-muted-foreground">Last 24h</span>
            </div>
            <p className="text-sm text-muted-foreground">
              No significant drift detected across last 5 batches.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Recent Signals</CardTitle>
            <CardDescription>High-priority findings from the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[
              {
                label: "chr17:41,196,312–41,204,991",
                note: "BRCA1 proximal enhancer, high-confidence",
              },
              {
                label: "chr8:128,748,210–128,749,002",
                note: "MYC regulatory region, moderate confidence",
              },
              {
                label: "chr2:2,142,501–2,144,192",
                note: "SOX2 enhancer candidate, high-confidence",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-muted-foreground">{item.note}</p>
                </div>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Compliance & Integrity</CardTitle>
            <CardDescription>Snapshot of audit readiness</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[
              "All outputs linked to source datasets",
              "Run metadata archived and versioned",
              "AI explanations stored alongside results",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
