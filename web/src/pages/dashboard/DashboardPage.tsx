import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardsApi, type DashboardData } from "@/services/dashboards";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  Clock,
  Plus,
  Radio,
  Eye,
  ArrowRight,
  ChevronRight,
  Users,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  usePageTitle("Dashboard");

  const loadData = useCallback(async () => {
    try {
      const res = await dashboardsApi.get();
      setData(res.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh when active interviews exist
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const hasActive = (data?.live_interviews?.length ?? 0) > 0;
    if (hasActive) {
      pollingRef.current = setInterval(loadData, 6000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [data?.live_interviews, loadData]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 py-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-8 w-10" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Failed to load dashboard data.</p>
        <Button variant="outline" size="sm" onClick={() => loadData()}>
          Try Again
        </Button>
      </div>
    );
  }

  const { stats, live_interviews, recent_assessments, recent_sessions } = data;
  const completionRate =
    stats.total_candidates > 0
      ? Math.round((stats.completed_count / stats.total_candidates) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-2">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Overview of your interviews, candidates, and vacancies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/vacancies/new")}
          >
            <Briefcase className="h-3.5 w-3.5 mr-1.5" />
            New Vacancy
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => navigate("/assessments/new")}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Assessment
          </Button>
        </div>
      </div>

      {/* Stats — inline horizontal */}
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <StatItem label="Assessments" value={stats.total_assessments} />
        <div className="w-px bg-border self-stretch hidden sm:block" />
        <StatItem label="Candidates" value={stats.total_candidates} />
        <div className="w-px bg-border self-stretch hidden sm:block" />
        <StatItem label="Completed" value={stats.completed_count} sub={`${completionRate}% rate`} />
        <div className="w-px bg-border self-stretch hidden sm:block" />
        <StatItem label="Vacancies" value={stats.total_vacancies} />
        {stats.active_count > 0 && (
          <>
            <div className="w-px bg-border self-stretch hidden sm:block" />
            <StatItem label="Active Now" value={stats.active_count} accent />
          </>
        )}
      </div>

      {/* Live banner */}
      {live_interviews.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {live_interviews.length} Live Interview{live_interviews.length > 1 ? "s" : ""}
            </div>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Radio className="h-3 w-3" /> Auto-syncing
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {live_interviews.map((live) => (
              <div
                key={live.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-md bg-background border hover:border-primary/40 transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium truncate">
                    {live.candidate_name || `Candidate #${live.id}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {live.assessment_name || "Interview Session"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-7 text-xs"
                  onClick={() =>
                    navigate(`/assessments/${live.assessment_id}/sessions/${live.id}/monitor`)
                  }
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Watch
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Recent Assessments */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recent Assessments
            </h2>
            <Link
              to="/assessments"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recent_assessments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No assessments yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recent_assessments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/assessments/${a.id}/invite`)}
                  className="w-full flex items-center justify-between py-3 group text-left"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {a.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {a.time_limit_min} min
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {a.candidate_count ?? 0}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground transition-colors" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recent Sessions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recent Sessions
            </h2>
            <Link
              to="/assessments"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recent_sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No candidate sessions yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recent_sessions.map((s) => {
                const displayName = s.candidate_name || `Candidate #${s.id}`;
                const handleClick = () => {
                  if (s.status === "active") {
                    navigate(`/assessments/${s.assessment_id}/sessions/${s.id}/monitor`);
                  } else if (s.status === "ended" && s.end_reason !== "error") {
                    navigate(`/assessments/${s.assessment_id}/sessions/${s.id}/portfolio`);
                  } else {
                    navigate(`/assessments/${s.assessment_id}/invite`);
                  }
                };

                return (
                  <button
                    key={s.id}
                    onClick={handleClick}
                    className="w-full flex items-center justify-between py-3 group text-left"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {s.assessment_name || "Interview Session"}
                      </p>
                    </div>
                    <SessionStatusDot status={s.status} endReason={s.end_reason} />
                  </button>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatItem({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-[60px]">
      <div className={cn("text-2xl font-bold tabular-nums leading-none", accent && "text-primary")}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</div>}
    </div>
  );
}

function SessionStatusDot({
  status,
  endReason,
}: {
  status: string;
  endReason?: string | null;
}) {
  if (status === "active") {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-primary shrink-0">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
        </span>
        Live
      </span>
    );
  }
  if (status === "ended" && endReason !== "error") {
    return (
      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
        Done
      </span>
    );
  }
  if (status === "ended" && endReason === "error") {
    return (
      <span className="text-[11px] font-medium text-destructive shrink-0">
        Failed
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-muted-foreground shrink-0">
      Awaiting
    </span>
  );
}
