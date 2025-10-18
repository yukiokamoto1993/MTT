"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Task,
  TaskFormData,
  TaskLevel,
  TASK_LEVEL_LABELS,
} from "@/types/task";

interface GoalCreationDialogProps {
  isOpen: boolean;
  level: TaskLevel;
  tasks: Task[];
  onSubmit: (data: TaskFormData) => void;
  onClose: () => void;
}

interface SelectOption {
  id: string;
  title: string;
}

const LEVEL_ACCENT_CLASS: Record<TaskLevel, string> = {
  kgi: "bg-blue-600 text-white",
  kpi: "bg-emerald-600 text-white",
  kai: "bg-amber-500 text-gray-900",
};

export default function GoalCreationDialog({
  isOpen,
  level,
  tasks,
  onSubmit,
  onClose,
}: GoalCreationDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedParent, setSelectedParent] = useState<string | undefined>();
  const [selectedKpi, setSelectedKpi] = useState<string | undefined>();

  const kgiOptions = useMemo(() => {
    const kgiList = tasks.filter((task) => task.level === "kgi");
    if (level !== "kai") {
      return kgiList;
    }
    return kgiList.filter((kgi) =>
      kgi.children.some((child) => child.level === "kpi")
    );
  }, [level, tasks]);

  const kpiOptionsByKgi = useMemo(() => {
    const map = new Map<string, SelectOption[]>();
    tasks
      .filter((task) => task.level === "kgi")
      .forEach((kgi) => {
        map.set(
          kgi.id,
          kgi.children
            .filter((child) => child.level === "kpi")
            .map((child) => ({ id: child.id, title: child.title }))
        );
      });
    return map;
  }, [tasks]);

  const kpiOptionsForSelectedKgi = useMemo(() => {
    if (!selectedParent) return [];
    return kpiOptionsByKgi.get(selectedParent) ?? [];
  }, [kpiOptionsByKgi, selectedParent]);

  useEffect(() => {
    setTitle("");
    setDescription("");
    setSelectedParent(undefined);
    setSelectedKpi(undefined);
  }, [isOpen, level]);

  // KPIレベル: KGIが1つだけの場合は自動選択
  useEffect(() => {
    if (level === "kpi" && kgiOptions.length === 1 && !selectedParent) {
      setSelectedParent(kgiOptions[0].id);
    }
  }, [level, kgiOptions, selectedParent]);

  // KAIレベル: KGIが1つ以上ある場合は先頭を自動選択
  useEffect(() => {
    if (level === "kai" && kgiOptions.length > 0 && !selectedParent) {
      setSelectedParent(kgiOptions[0].id);
    }
  }, [level, kgiOptions, selectedParent]);

  // KAIレベル: KPIが1つ以上ある場合は先頭を自動選択
  useEffect(() => {
    if (level !== "kai") return;
    if (!selectedParent) {
      setSelectedKpi(undefined);
      return;
    }
    const options = kpiOptionsForSelectedKgi;
    if (options.length > 0 && !selectedKpi) {
      setSelectedKpi(options[0].id);
    } else if (options.length === 0) {
      setSelectedKpi(undefined);
    } else if (!options.some((option) => option.id === selectedKpi)) {
      setSelectedKpi(options[0].id);
    }
  }, [level, selectedParent, kpiOptionsForSelectedKgi, selectedKpi]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      return;
    }

    if (level === "kpi" && !selectedParent) {
      return;
    }

    if (level === "kai" && (!selectedParent || !selectedKpi)) {
      return;
    }

    onSubmit({
      title: trimmedTitle,
      description: trimmedDescription ? trimmedDescription : undefined,
      level,
      parentId: level === "kgi" ? undefined : level === "kpi" ? selectedParent : selectedKpi,
    });

    onClose();
  };

  const levelMeta = TASK_LEVEL_LABELS[level];
  const levelAccentClass = LEVEL_ACCENT_CLASS[level];

  const isSubmitDisabled =
    !title.trim() ||
    (level === "kpi" && !selectedParent) ||
    (level === "kai" && (!selectedParent || !selectedKpi));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div
          className={`rounded-t-2xl px-6 py-4 text-sm font-semibold ${levelAccentClass}`}
        >
          {levelMeta.short} 作成
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-6 pb-6 pt-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="goal-title">
              タイトル
            </label>
            <input
              id="goal-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.ctrlKey && event.key === "Enter" && !isSubmitDisabled) {
                  event.preventDefault();
                  handleSubmit(event as unknown as React.FormEvent);
                }
              }}
              placeholder="目標のタイトルを入力"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {(level === "kpi" || level === "kai") && (
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700 dark:text-gray-200"
                htmlFor="goal-parent-kgi"
              >
                紐づけるKGI
              </label>
              <div className="relative">
                <select
                  id="goal-parent-kgi"
                  value={selectedParent ?? ""}
                  onChange={(event) =>
                    setSelectedParent(event.target.value || undefined)
                  }
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  disabled={kgiOptions.length === 0}
                >
                  <option value="" disabled>
                    {kgiOptions.length === 0
                      ? level === "kai"
                        ? "紐づけ可能なKGIがありません"
                        : "KGIが登録されていません"
                      : "KGIを選択"}
                  </option>
                  {kgiOptions.map((kgi) => (
                    <option key={kgi.id} value={kgi.id}>
                      {kgi.title}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </div>
            </div>
          )}

          {level === "kai" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="goal-parent-kpi">
                紐づけるKPI
              </label>
              <div className="relative">
                <select
                  id="goal-parent-kpi"
                  value={selectedKpi ?? ""}
                  onChange={(event) =>
                    setSelectedKpi(event.target.value || undefined)
                  }
                  disabled={
                    !selectedParent || kpiOptionsForSelectedKgi.length === 0
                  }
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="" disabled>
                    {!selectedParent
                      ? "まずKGIを選択してください"
                      : kpiOptionsForSelectedKgi.length === 0
                      ? "選択されたKGIに紐づくKPIがありません"
                      : "KPIを選択"}
                  </option>
                  {kpiOptionsForSelectedKgi.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="goal-description">
              説明(任意)
            </label>
            <textarea
              id="goal-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onKeyDown={(event) => {
                if (event.ctrlKey && event.key === "Enter" && !isSubmitDisabled) {
                  event.preventDefault();
                  handleSubmit(event as unknown as React.FormEvent);
                }
              }}
              placeholder="説明(任意)"
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-1 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              作成する
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
