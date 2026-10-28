import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardsApi, type DashboardData } from "@/services/dashboards";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  ClipboardList,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Plus,
  Radio,
  Eye,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Hourglass,
  AlertCircle,
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-destructive/40 rounded-lg p-8 text-center space-y-3">
        <p className="text-destructive font-medium">Failed to load dashboard data.</p>
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
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assessor Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor real-time voice interviews, manage competency agendas, and view evaluations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/vacancies/new")}>
            <Briefcase className="h-4 w-4 mr-1.5" />
            New Vacancy
          </Button>
          <Button size="sm" onClick={() => navigate("/assessments/new")}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Assessment
          </Button>
        </div>
      </div>

      {/* Live Active Interviews Banner */}
      {live_interviews.length > 0 && (
        <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="font-semibold text-sm text-foreground">
                {live_interviews.length} Live Interview{live_interviews.length > 1 ? "s" : ""} in Progress
              </span>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Radio className="h-3 w-3 text-primary animate-pulse" /> Auto-syncing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {live_interviews.map((live) => (
              <div
                key={live.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background border shadow-2xs hover:border-primary/50 transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <p className="font-medium text-sm truncate">
                    {live.candidate_name || `Candidate #${live.id}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {live.assessment_name || "Interview Session"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="shrink-0 h-8 text-xs"
                  onClick={() =>
                    navigate(
                      `/assessments/${live.assessment_id}/sessions/${live.id}/monitor`
                    )
                  }
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Monitor Live
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assessments */}
        <Card className="hover:border-primary/30 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Assessments</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ClipboardList className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold">{stats.total_assessments}</div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <span>Active agenda templates</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Candidates */}
        <Card className="hover:border-primary/30 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Candidates</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold">{stats.total_candidates}</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {stats.pending_count} awaiting interview
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Completed Interviews */}
        <Card className="hover:border-primary/30 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Completed</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.completed_count}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span>{completionRate}% completion rate</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Target Vacancies */}
        <Card className="hover:border-primary/30 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Vacancies</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Briefcase className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold">{stats.total_vacancies}</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Benchmark job profiles
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Section: Recent Assessments & Recent Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assessments */}
        <Card>
          <CardHeader className="py-4 px-5 flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Assessments</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quick access to recent interview agendas
              </p>
            </div>
            <Link
              to="/assessments"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {recent_assessments.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No assessments yet.
              </div>
            ) : (
              recent_assessments.map((a) => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/assessments/${a.id}/invite`)}
                  className="p-3.5 px-5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                      {a.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {a.time_limit_min} min
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {a.candidate_count ?? 0} candidates
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Candidate Activity */}
        <Card>
          <CardHeader className="py-4 px-5 flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Candidate Sessions</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest interview invitations and results
              </p>
            </div>
            <Link
              to="/assessments"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Assessments <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {recent_sessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No candidate sessions yet.
              </div>
            ) : (
              recent_sessions.map((s) => {
                const displayName = s.candidate_name || `Candidate #${s.id}`;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      if (s.status === "active") {
                        navigate(`/assessments/${s.assessment_id}/sessions/${s.id}/monitor`);
                      } else if (s.status === "ended" && s.end_reason !== "error") {
                        navigate(`/assessments/${s.assessment_id}/sessions/${s.id}/portfolio`);
                      } else {
                        navigate(`/assessments/${s.assessment_id}/invite`);
                      }
                    }}
                    className="p-3.5 px-5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 pr-3 space-y-0.5">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.assessment_name || "Interview Session"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {s.status === "pending" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                          <Hourglass className="h-3 w-3" /> Awaiting
                        </span>
                      )}
                      {s.status === "active" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          <Radio className="h-3 w-3 animate-pulse" /> Live
                        </span>
                      )}
                      {s.status === "ended" && s.end_reason === "error" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                          <AlertCircle className="h-3 w-3" /> Failed
                        </span>
                      )}
                      {s.status === "ended" && s.end_reason !== "error" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

