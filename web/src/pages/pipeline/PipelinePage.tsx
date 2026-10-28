import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  pipelineApi,
  deriveColumn,
  type PipelineSession,
  type KanbanColumn,
  type PipelineStage,
} from "@/services/pipeline";
import {
  Clock,
  Radio,
  CheckCircle2,
  Star,
  Briefcase,
  XCircle,
  Mail,
  Eye,
  FileText,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Column definitions ───────────────────────────────────────────────────────

interface ColumnDef {
  id: KanbanColumn;
  label: string;
  icon: React.ElementType;
  color: string;
  headerColor: string;
  draggable: boolean; // cards in this column can be dragged out
  droppable: boolean; // cards can be dropped into this column
}

const COLUMNS: ColumnDef[] = [
  {
    id: "invited",
    label: "Invited",
    icon: Mail,
    color: "border-blue-200 dark:border-blue-800",
    headerColor: "text-blue-600 dark:text-blue-400",
    draggable: false,
    droppable: false,
  },
  {
    id: "interviewing",
    label: "Interviewing",
    icon: Radio,
    color: "border-amber-200 dark:border-amber-800",
    headerColor: "text-amber-600 dark:text-amber-400",
    draggable: false,
    droppable: false,
  },
  {
    id: "evaluated",
    label: "Evaluated",
    icon: CheckCircle2,
    color: "border-violet-200 dark:border-violet-800",
    headerColor: "text-violet-600 dark:text-violet-400",
    draggable: true,
    droppable: true,
  },
  {
    id: "shortlisted",
    label: "Shortlisted",
    icon: Star,
    color: "border-indigo-200 dark:border-indigo-800",
    headerColor: "text-indigo-600 dark:text-indigo-400",
    draggable: true,
    droppable: true,
  },
  {
    id: "hired",
    label: "Hired",
    icon: Briefcase,
    color: "border-emerald-200 dark:border-emerald-800",
    headerColor: "text-emerald-600 dark:text-emerald-400",
    draggable: true,
    droppable: true,
  },
  {
    id: "rejected",
    label: "Rejected",
    icon: XCircle,
    color: "border-rose-200 dark:border-rose-800",
    headerColor: "text-rose-500 dark:text-rose-400",
    draggable: true,
    droppable: true,
  },
];

// Stage mapping — column id → pipeline_stage value sent to API
const COLUMN_TO_STAGE: Partial<Record<KanbanColumn, PipelineStage>> = {
  shortlisted: "shortlisted",
  hired: "hired",
  rejected: "rejected",
  evaluated: null, // null = revert to auto
};

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  usePageTitle("Pipeline");
  const [sessions, setSessions] = useState<PipelineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeSession, setActiveSession] = useState<PipelineSession | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

  useEffect(() => {
    load();
  }, [load]);

  // Group sessions by column
  const grouped = COLUMNS.reduce<Record<KanbanColumn, PipelineSession[]>>(
    (acc, col) => {
      acc[col.id] = sessions.filter((s) => deriveColumn(s) === col.id);
      return acc;
    },
    {} as Record<KanbanColumn, PipelineSession[]>
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = Number(event.active.id);
    setActiveSession(sessions.find((s) => s.id === id) ?? null);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // visual feedback handled by droppable
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveSession(null);
    const { active, over } = event;
    if (!over) return;

    const sessionId = Number(active.id);
    const targetColId = String(over.id) as KanbanColumn;

    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const currentCol = deriveColumn(session);
    if (currentCol === targetColId) return;

    // Only allow moving if target column is droppable
    const targetColDef = COLUMNS.find((c) => c.id === targetColId);
    if (!targetColDef?.droppable) return;

    // Only allow dragging from draggable columns
    const currentColDef = COLUMNS.find((c) => c.id === currentCol);
    if (!currentColDef?.draggable) return;

    const newStage: PipelineStage = COLUMN_TO_STAGE[targetColId] !== undefined
      ? (COLUMN_TO_STAGE[targetColId] as PipelineStage)
      : null;

    // Optimistic update
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, pipeline_stage: newStage } : s
      )
    );

    try {
      await pipelineApi.updateStage(sessionId, newStage);
    } catch {
      // Revert on error
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, pipeline_stage: session.pipeline_stage } : s
        )
      );
    }
  };

  if (loading) return <PipelineSkeleton />;

  if (error) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Failed to load pipeline data.</p>
        <Button variant="outline" size="sm" onClick={load}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Recruitment Pipeline</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Drag candidates across stages to track progress.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={load}>
          Refresh
        </Button>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-180px)]">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              sessions={grouped[col.id]}
            />
          ))}
        </div>

        <DragOverlay>
          {activeSession && (
            <SessionCard
              session={activeSession}
              column={COLUMNS.find((c) => c.id === deriveColumn(activeSession))!}
              overlay
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ── Column Component ─────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  sessions,
}: {
  column: ColumnDef;
  sessions: PipelineSession[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    disabled: !column.droppable,
  });

  const Icon = column.icon;

  return (
    <div
      className={cn(
        "flex flex-col w-64 shrink-0 rounded-xl border bg-muted/20 transition-colors",
        column.color,
        isOver && column.droppable && "bg-muted/50 ring-1 ring-primary/30"
      )}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-inherit">
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold", column.headerColor)}>
          <Icon className="h-3.5 w-3.5" />
          {column.label}
        </div>
        <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
          {sessions.length}
        </span>
      </div>

      {/* Cards area */}
      <SortableContext
        items={sessions.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="flex-1 p-2 space-y-2 min-h-[120px]">
          {sessions.length === 0 && (
            <div className="flex items-center justify-center h-16 text-[11px] text-muted-foreground/60 border border-dashed border-muted-foreground/20 rounded-lg">
              {column.droppable ? "Drop here" : "No candidates"}
            </div>
          )}
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              column={column}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Card Component ───────────────────────────────────────────────────────────

function SessionCard({
  session,
  column,
  overlay = false,
}: {
  session: PipelineSession;
  column: ColumnDef;
  overlay?: boolean;
}) {
  const navigate = useNavigate();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: session.id,
    disabled: !column.draggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayName = session.candidate_name || `Candidate #${session.id}`;
  const isLive = session.status === "active";

  const handleNavigate = () => {
    if (session.status === "active") {
      navigate(`/assessments/${session.assessment_id}/sessions/${session.id}/monitor`);
    } else if (session.status === "ended" && session.end_reason !== "error") {
      navigate(`/assessments/${session.assessment_id}/sessions/${session.id}/portfolio`);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-background rounded-lg border p-2.5 select-none",
        "transition-shadow hover:shadow-sm",
        isDragging && "opacity-30",
        overlay && "shadow-lg rotate-1 opacity-95",
        !overlay && column.draggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        {column.draggable && !overlay && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 touch-none"
            tabIndex={-1}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          {/* Name */}
          <p className="text-xs font-semibold truncate leading-tight">{displayName}</p>

          {/* Assessment */}
          {session.assessment_name && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {session.assessment_name}
            </p>
          )}

          {/* Live badge */}
          {isLive && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
              </span>
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Live
              </span>
            </div>
          )}

          {/* Duration */}
          {session.duration_seconds && session.duration_seconds > 0 && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {Math.round(session.duration_seconds / 60)} min
            </div>
          )}

          {/* Action buttons */}
          {(session.status === "active" || (session.status === "ended" && session.end_reason !== "error")) && (
            <div className="flex gap-1 mt-2">
              {session.status === "active" && (
                <button
                  onClick={handleNavigate}
                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Eye className="h-2.5 w-2.5" /> Monitor
                </button>
              )}
              {session.status === "ended" && session.end_reason !== "error" && (
                <button
                  onClick={handleNavigate}
                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  <FileText className="h-2.5 w-2.5" /> Portfolio
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function PipelineSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="w-64 shrink-0 rounded-xl border bg-muted/20 p-2.5 space-y-2">
            <Skeleton className="h-5 w-24" />
            {[1, 2].map((j) => (
              <Skeleton key={j} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
