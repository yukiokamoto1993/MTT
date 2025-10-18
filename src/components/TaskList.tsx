"use client";

import { useMemo } from "react";
import {
  Task,
  TaskLevel,
  TASK_LEVEL_LABELS,
} from "@/types/task";
import TaskItem from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, title: string, description?: string) => void;
  onAddChildTask: (
    parentId: string,
    level: TaskLevel,
    title: string,
    description?: string
  ) => void;
  onRequestCreate: (level: TaskLevel) => void;
  onSummaryInteractionChange: (level: TaskLevel, isActive: boolean) => void;
  hiddenSummaryLevels: TaskLevel[];
}

const summaryStyles: Record<
  TaskLevel,
  { container: string; accent: string; progress: string }
> = {
  kgi: {
    container:
      "border-blue-200 bg-blue-50/60 dark:border-blue-800/60 dark:bg-blue-900/20",
    accent: "text-blue-700 dark:text-blue-200",
    progress: "bg-blue-500",
  },
  kpi: {
    container:
      "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/60 dark:bg-emerald-900/20",
    accent: "text-emerald-700 dark:text-emerald-200",
    progress: "bg-emerald-500",
  },
  kai: {
    container:
      "border-amber-200 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-900/20",
    accent: "text-amber-700 dark:text-amber-200",
    progress: "bg-amber-500",
  },
};

const PROGRESS_WIDTH_CLASS_MAP: Record<number, string> = {
  0: "w-[0%]",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-[50%]",
  55: "w-[55%]",
  60: "w-[60%]",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-[75%]",
  80: "w-[80%]",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-[100%]",
};

const getProgressWidthClass = (ratio: number): string => {
  if (ratio <= 0) return PROGRESS_WIDTH_CLASS_MAP[0];
  if (ratio >= 100) return PROGRESS_WIDTH_CLASS_MAP[100];
  const rounded = Math.ceil(ratio / 5) * 5;
  return (
    PROGRESS_WIDTH_CLASS_MAP[
      rounded as keyof typeof PROGRESS_WIDTH_CLASS_MAP
    ]
  );
};

const flattenTasks = (items: Task[]): Task[] => {
  const result: Task[] = [];
  const traverse = (list: Task[]) => {
    list.forEach((task) => {
      result.push(task);
      if (task.children.length > 0) {
        traverse(task.children);
      }
    });
  };
  traverse(items);
  return result;
};

export default function TaskList({
  tasks,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onAddChildTask,
  onRequestCreate,
  onSummaryInteractionChange,
  hiddenSummaryLevels,
}: TaskListProps) {
  const flattened = useMemo(() => flattenTasks(tasks), [tasks]);
  const hiddenSet = useMemo(
    () => new Set(hiddenSummaryLevels),
    [hiddenSummaryLevels]
  );

  const stats = useMemo(() => {
    const initial: Record<TaskLevel, { total: number; completed: number }> = {
      kgi: { total: 0, completed: 0 },
      kpi: { total: 0, completed: 0 },
      kai: { total: 0, completed: 0 },
    };

    return flattened.reduce((acc, task) => {
      acc[task.level].total += 1;
      if (task.completed) {
        acc[task.level].completed += 1;
      }
      return acc;
    }, initial);
  }, [flattened]);

  const hasNoTasks = tasks.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          目標サマリー
        </h2>
  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 overflow-hidden">
          {(() => {
            const levels = (Object.keys(stats) as TaskLevel[]).filter(
              (level) => !hiddenSet.has(level)
            );

            if (levels.length === 0) {
              return (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white/70 px-5 py-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
                  編集中のため、一部のサマリー表示を一時的に非表示にしています。
                </div>
              );
            }

            return levels.map((level) => {
              const meta = TASK_LEVEL_LABELS[level];
              const style = summaryStyles[level];
              const { total, completed } = stats[level];
              const ratio = total === 0 ? 0 : Math.round((completed / total) * 100);

              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => onRequestCreate(level)}
                  className={`group w-full rounded-xl border px-5 py-4 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 hover:shadow-md dark:focus:ring-offset-gray-900 ${style.container}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-xs font-semibold ${style.accent}`}>
                        {meta.short}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-100">
                        {meta.long}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {total}
                      </span>
                      <span className="rounded-full border border-gray-300 bg-white p-2 text-sm font-semibold text-gray-600 shadow-sm transition group-hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:group-hover:bg-gray-700">
                        +
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>完了</span>
                      <span>
                        {completed} / {total}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-2 ${style.progress} ${getProgressWidthClass(ratio)}`}
                      />
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {meta.description}
                  </p>
                </button>
              );
            });
          })()}
        </div>
      </section>

      <div className="max-h-[65vh] overflow-y-auto pr-1 sm:pr-2">
        {hasNoTasks ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-gray-500 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <p className="text-lg font-medium">まだ目標が登録されていません</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              上のフォームからKGI（長期目標）を作成して、KPIやKAIを紐づけていきましょう。
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-2">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                onUpdate={onUpdateTask}
                onAddChild={onAddChildTask}
                ancestorIds={[]}
                depth={0}
                parentId={undefined}
                onSummaryLevelInteractionChange={
                  onSummaryInteractionChange
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
