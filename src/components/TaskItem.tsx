"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Task,
  TaskLevel,
  TASK_LEVEL_FLOW,
  TASK_LEVEL_LABELS,
} from "@/types/task";

export interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string, description?: string) => void;
  onAddChild: (
    parentId: string,
    level: TaskLevel,
    title: string,
    description?: string
  ) => void;
  depth: number;
  parentId?: string;
  ancestorIds: string[];
  onSummaryLevelInteractionChange: (level: TaskLevel, isActive: boolean) => void;
}

const levelStyles: Record<
  TaskLevel,
  {
    container: string;
    badge: string;
    addButton: string;
    childConnector: string;
  }
> = {
  kgi: {
    container:
      "border-blue-200 bg-white/90 dark:border-blue-900/60 dark:bg-blue-950/20",
    badge:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    addButton:
      "text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/40",
    childConnector: "border-blue-200 dark:border-blue-800/60",
  },
  kpi: {
    container:
      "border-emerald-200 bg-white/90 dark:border-emerald-900/60 dark:bg-emerald-950/20",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    addButton:
      "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/40",
    childConnector: "border-emerald-200 dark:border-emerald-800/60",
  },
  kai: {
    container:
      "border-amber-200 bg-white/90 dark:border-amber-900/60 dark:bg-amber-950/20",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    addButton:
      "text-amber-600 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/40",
    childConnector: "border-amber-200 dark:border-amber-800/60",
  },
};

export default function TaskItem({
  task,
  onToggle,
  onDelete,
  onUpdate,
  onAddChild,
  depth,
  parentId,
  ancestorIds,
  onSummaryLevelInteractionChange,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(
    task.description ?? ""
  );
  const [childTitle, setChildTitle] = useState("");
  const [childDescription, setChildDescription] = useState("");

  const nextLevel = TASK_LEVEL_FLOW[task.level];
  const levelMeta = TASK_LEVEL_LABELS[task.level];
  const levelStyle = levelStyles[task.level];

  useEffect(() => {
    onSummaryLevelInteractionChange(task.level, isEditing);
    return () => {
      onSummaryLevelInteractionChange(task.level, false);
    };
  }, [isEditing, onSummaryLevelInteractionChange, task.level]);

  useEffect(() => {
    if (!nextLevel) {
      return;
    }
    onSummaryLevelInteractionChange(nextLevel, isAddingChild);
    return () => {
      onSummaryLevelInteractionChange(nextLevel, false);
    };
  }, [isAddingChild, nextLevel, onSummaryLevelInteractionChange]);

  useEffect(() => {
    if (!isEditing) {
      setEditTitle(task.title);
      setEditDescription(task.description ?? "");
    }
  }, [isEditing, task.description, task.title]);

  useEffect(() => {
    if (!isAddingChild) {
      setChildTitle("");
      setChildDescription("");
    }
  }, [isAddingChild]);

  const childStats = useMemo(() => {
    if (task.children.length === 0) {
      return null;
    }
    const total = task.children.length;
    const completed = task.children.filter((child) => child.completed).length;
    return { total, completed };
  }, [task.children]);

  const childLabel =
    nextLevel !== null ? TASK_LEVEL_LABELS[nextLevel].short : undefined;
  const timelineSpacing = depth > 0 ? "mt-2" : "mt-3";

  const handleUpdate = () => {
    const trimmedTitle = editTitle.trim();
    const trimmedDescription = editDescription.trim();
    if (!trimmedTitle) {
      return;
    }
    onUpdate(
      task.id,
      trimmedTitle,
      trimmedDescription ? trimmedDescription : undefined
    );
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setIsEditing(false);
  };

  const handleAddChild = () => {
    if (!nextLevel) {
      return;
    }
    const trimmedTitle = childTitle.trim();
    const trimmedDescription = childDescription.trim();
    if (!trimmedTitle) {
      return;
    }
    onAddChild(
      task.id,
      nextLevel,
      trimmedTitle,
      trimmedDescription ? trimmedDescription : undefined
    );
    setIsAddingChild(false);
  };

  const createdAtText = useMemo(() => {
    try {
      return new Date(task.createdAt).toLocaleString("ja-JP");
    } catch (error) {
      return task.createdAt;
    }
  }, [task.createdAt]);

  const updatedAtText = useMemo(() => {
    if (!task.updatedAt) {
      return undefined;
    }
    try {
      return new Date(task.updatedAt).toLocaleString("ja-JP");
    } catch (error) {
      return task.updatedAt;
    }
  }, [task.updatedAt]);

  const titleClasses = task.completed
    ? "text-xs font-semibold tracking-tight line-through text-gray-500 dark:text-gray-400"
    : "text-xs font-semibold tracking-tight text-gray-900 dark:text-white";

  const descriptionClasses = task.completed
    ? "mt-0.5 text-[11px] leading-snug text-gray-400 line-through dark:text-gray-500"
    : "mt-0.5 text-[11px] leading-snug text-gray-600 dark:text-gray-300";

  const containerStateClasses = task.completed
    ? "opacity-90 ring-1 ring-gray-100 dark:ring-white/5"
    : "shadow-sm";

  return (
    <div className="space-y-2">
      <div
        className={`rounded-2xl border px-3 py-1 transition-all ${levelStyle.container} ${containerStateClasses}`}
      >
        {isEditing ? (
          <div className="space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${levelStyle.badge}`}
                >
                  {levelMeta.short}
                </span>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {levelMeta.long}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span>作成: {createdAtText}</span>
                {updatedAtText && <span>更新: {updatedAtText}</span>}
                {childStats && childLabel && (
                  <span>
                    {childLabel} 完了: {childStats.completed} / {childStats.total}
                  </span>
                )}
              </div>
            </div>
            <input
              type="text"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              placeholder="タイトル"
              aria-label="タイトル"
              autoFocus
            />
            <textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              placeholder="説明（任意）"
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              aria-label="説明"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUpdate}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                保存する
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggle(task.id)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                aria-label={`${levelMeta.short}の完了状態`}
              />
              <div className="flex-1 flex flex-col justify-center gap-0.5">
                <h3 className={titleClasses}>{task.title}</h3>
                {task.description && (
                  <p className={descriptionClasses}>{task.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end md:self-start">
              {nextLevel && !isAddingChild && (
                <button
                  type="button"
                  onClick={() => setIsAddingChild(true)}
                  className={`rounded-lg p-2 text-sm font-medium transition ${levelStyle.addButton}`}
                  title={`${TASK_LEVEL_LABELS[nextLevel].short}を追加`}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/40"
                title="編集"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/40"
                title="削除"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {isAddingChild && nextLevel && !isEditing && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4 dark:border-gray-600 dark:bg-gray-900/40">
          <div className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">
            {TASK_LEVEL_LABELS[nextLevel].short} を追加
          </div>
          <div className="space-y-2">
            <input
              type="text"
              value={childTitle}
              onChange={(event) => setChildTitle(event.target.value)}
              placeholder={`新しい${TASK_LEVEL_LABELS[nextLevel].long}のタイトル`}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              aria-label={`${TASK_LEVEL_LABELS[nextLevel].short}のタイトル`}
            />
            <textarea
              value={childDescription}
              onChange={(event) => setChildDescription(event.target.value)}
              placeholder="説明（任意）"
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              aria-label="説明"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddChild}
                disabled={!childTitle.trim()}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                追加する
              </button>
              <button
                type="button"
                onClick={() => setIsAddingChild(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {task.children.length > 0 && (
        <div
          className={`${timelineSpacing} space-y-2 border-l-2 pl-5 dark:pl-6 ${levelStyle.childConnector}`}
        >
          {task.children.map((child) => (
            <TaskItem
              key={child.id}
              task={child}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onAddChild={onAddChild}
              ancestorIds={[...ancestorIds, task.id]}
              onSummaryLevelInteractionChange={
                onSummaryLevelInteractionChange
              }
              depth={depth + 1}
              parentId={task.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
