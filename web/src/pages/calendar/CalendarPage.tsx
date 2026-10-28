import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { pipelineApi, type PipelineSession } from "@/services/pipeline";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type EventType = "invited" | "started" | "ended" | "failed";

interface CalendarEvent {
  date: string; // "YYYY-MM-DD"
  time: string; // ISO string
  type: EventType;
  label: string;
  session: PipelineSession;
}

// ── Constants ────────────────────────────────────────────────────────────────

const EVENT_STYLES: Record<EventType, { dot: string; bg: string; text: string; Icon: React.ElementType }> = {
  invited:  { dot: "bg-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30",    text: "text-blue-700 dark:text-blue-300",   Icon: Mail },
  started:  { dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30",  text: "text-amber-700 dark:text-amber-300", Icon: Radio },
  ended:    { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", Icon: CheckCircle2 },
  failed:   { dot: "bg-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/30",    text: "text-rose-700 dark:text-rose-300",   Icon: AlertCircle },
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDate(iso: string): string {
  // Return "YYYY-MM-DD" in local timezone
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildEvents(sessions: PipelineSession[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const s of sessions) {
    if (s.created_at) {
      events.push({
        date: toLocalDate(s.created_at),
        time: s.created_at,
        type: "invited",
        label: "Candidate invited",
        session: s,
      });
    }
    if (s.started_at) {
      events.push({
        date: toLocalDate(s.started_at),
        time: s.started_at,
        type: "started",
        label: "Interview started",
        session: s,
      });
    }
    if (s.ended_at) {
      const type: EventType = s.end_reason === "error" ? "failed" : "ended";
      events.push({
        date: toLocalDate(s.ended_at),
        time: s.ended_at,
        type,
        label: type === "failed" ? "Interview failed" : "Interview completed",
        session: s,
      });
    }
  }
  return events.sort((a, b) => a.time.localeCompare(b.time));
}

/** Build 6-week grid starting from the Monday before month's first day */
function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // getDay(): 0=Sun,1=Mon...6=Sat — convert to Mon-first (0=Mon...6=Sun)
  const startDow = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startDow);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  usePageTitle("Calendar");

  const today = new Date();
  const [sessions, setSessions] = useState<PipelineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [year, setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string>(dateKey(today));

  const load = useCallback(async () => {
    try {
      const res = await pipelineApi.getSessions();
      setSessions(res.data.sessions);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const allEvents = useMemo(() => buildEvents(sessions), [sessions]);
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of allEvents) {
      (map[ev.date] ??= []).push(ev);
    }
    return map;
  }, [allEvents]);

  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  const todayKey = dateKey(today);
  const selectedEvents = eventsByDate[selected] ?? [];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelected(todayKey);
  };

  if (loading) return <CalendarSkeleton />;

  if (error) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Failed to load calendar data.</p>
        <Button variant="outline" size="sm" onClick={load}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Session activity by date — invitations, interviews, and completions.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(EVENT_STYLES) as [EventType, typeof EVENT_STYLES[EventType]][]).map(([type, s]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full shrink-0", s.dot)} />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* ── Calendar ── */}
        <div className="flex-1 min-w-0 border rounded-xl overflow-hidden bg-background">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-semibold min-w-[140px] text-center">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={goToday}>
              Today
            </Button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {grid.map((day, i) => {
              const key = dateKey(day);
              const isCurrentMonth = day.getMonth() === month;
              const isToday = key === todayKey;
              const isSelected = key === selected;
              const events = eventsByDate[key] ?? [];

              // Collect unique event types for dots
              const types = [...new Set(events.map((e) => e.type))];

              return (
                <button
                  key={i}
                  onClick={() => setSelected(key)}
                  className={cn(
                    "relative min-h-[72px] p-1.5 border-b border-r text-left transition-colors",
                    "last:border-r-0",
                    isCurrentMonth ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/20",
                    isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/30",
                  )}
                >
                  {/* Day number */}
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday && "bg-primary text-primary-foreground",
                      !isToday && isCurrentMonth && "text-foreground",
                      !isToday && !isCurrentMonth && "text-muted-foreground/40",
                    )}
                  >
                    {day.getDate()}
                  </span>

                  {/* Event dots */}
                  {types.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {types.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className={cn("h-1.5 w-1.5 rounded-full", EVENT_STYLES[t].dot)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Event count badge */}
                  {events.length > 0 && (
                    <span className="absolute bottom-1 right-1.5 text-[10px] text-muted-foreground/60">
                      {events.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Event panel ── */}
        <div className="w-full lg:w-72 shrink-0 border rounded-xl overflow-hidden bg-background">
          {/* Panel header */}
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-semibold">
              {new Date(selected + "T00:00:00").toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedEvents.length === 0
                ? "No events"
                : `${selectedEvents.length} event${selectedEvents.length > 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Events list */}
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {selectedEvents.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground/60">
                No session activity on this day.
              </div>
            ) : (
              selectedEvents.map((ev, i) => (
                <EventCard key={i} event={ev} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: CalendarEvent }) {
  const navigate = useNavigate();
  const { type, label, time, session } = event;
  const style = EVENT_STYLES[type];
  const Icon = style.Icon;
  const displayName = session.candidate_name || `Candidate #${session.id}`;

  const handleAction = () => {
    if (session.status === "active") {
      navigate(`/assessments/${session.assessment_id}/sessions/${session.id}/monitor`);
    } else if (session.status === "ended" && session.end_reason !== "error") {
      navigate(`/assessments/${session.assessment_id}/sessions/${session.id}/portfolio`);
    }
  };

  const canNavigate =
    session.status === "active" ||
    (session.status === "ended" && session.end_reason !== "error");

  return (
    <div className={cn("px-4 py-3 space-y-1.5", style.bg)}>
      {/* Event type + time */}
      <div className="flex items-center justify-between">
        <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", style.text)}>
          <Icon className="h-3 w-3" />
          {label}
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {toLocalTime(time)}
        </span>
      </div>

      {/* Candidate & assessment */}
      <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
      {session.assessment_name && (
        <p className="text-[11px] text-muted-foreground truncate">{session.assessment_name}</p>
      )}

      {/* Duration (for ended events) */}
      {type === "ended" && session.duration_seconds && session.duration_seconds > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Duration: {Math.round(session.duration_seconds / 60)} min
        </p>
      )}

      {/* Action button */}
      {canNavigate && (
        <button
          onClick={handleAction}
          className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          {session.status === "active" ? (
            <><Eye className="h-3 w-3" /> Monitor live</>
          ) : (
            <><FileText className="h-3 w-3" /> View portfolio</>
          )}
        </button>
      )}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-4">
        <div className="flex-1 border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-7 w-16" />
          </div>
          <div className="grid grid-cols-7 gap-px p-2">
            {Array.from({ length: 42 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
        <div className="w-72 border rounded-xl">
          <div className="p-4 border-b space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

