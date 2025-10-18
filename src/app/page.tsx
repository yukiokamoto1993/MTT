"use client";

import { useCallback, useMemo, useState } from "react";
import TaskList from "@/components/TaskList";
import GoalCreationDialog from "@/components/TaskForm";
import AuthPanel from "@/components/AuthPanel";
import UserInfo from "@/components/UserInfo";
import { Task, TaskFormData, TaskLevel, TASK_LEVEL_FLOW } from "@/types/task";
import { useTaskSync } from "@/hooks/useTaskSync";

const generateId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `goal-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
};

const isTaskLevel = (value: unknown): value is TaskLevel =>
  value === "kgi" || value === "kpi" || value === "kai";

const cascadeCompletionState = (
  task: Task,
  completed: boolean,
  timestamp: string
): Task => ({
  ...task,
  completed,
  updatedAt: timestamp,
  children: task.children.map((child) =>
    cascadeCompletionState(child, completed, timestamp)
  ),
});

const updateTaskInTree = (
  items: Task[],
  id: string,
  updater: (task: Task) => Task,
  timestamp?: string
): Task[] => {
  let changed = false;
  const next = items.map((task) => {
    if (task.id === id) {
      changed = true;
      return updater(task);
    }
    if (task.children.length > 0) {
      const updatedChildren = updateTaskInTree(
        task.children,
        id,
        updater,
        timestamp
      );
      if (updatedChildren !== task.children) {
        changed = true;
        return {
          ...task,
          children: updatedChildren,
          updatedAt: timestamp ?? task.updatedAt,
        };
      }
    }
    return task;
  });
  return changed ? next : items;
};

const addTaskToParent = (
  items: Task[],
  parentId: string,
  newTask: Task,
  timestamp: string
): Task[] => {
  let changed = false;
  const next = items.map((task) => {
    if (task.id === parentId) {
      changed = true;
      return {
        ...task,
        updatedAt: timestamp,
        children: [...task.children, newTask],
      };
    }
    if (task.children.length > 0) {
      const updatedChildren = addTaskToParent(
        task.children,
        parentId,
        newTask,
        timestamp
      );
      if (updatedChildren !== task.children) {
        changed = true;
        return {
          ...task,
          updatedAt: timestamp,
          children: updatedChildren,
        };
      }
    }
    return task;
  });
  return changed ? next : items;
};

const removeTaskFromTree = (
  items: Task[],
  id: string,
  timestamp: string
): Task[] => {
  let changed = false;
  const filtered = items
    .map((task) => {
      if (task.id === id) {
        changed = true;
        return null;
      }
      if (task.children.length > 0) {
        const updatedChildren = removeTaskFromTree(
          task.children,
          id,
          timestamp
        );
        if (updatedChildren !== task.children) {
          changed = true;
          return {
            ...task,
            updatedAt: timestamp,
            children: updatedChildren,
          };
        }
      }
      return task;
    })
    .filter((value): value is Task => value !== null);
  return changed ? filtered : items;
};

const normalizeTask = (
  item: unknown,
  fallbackLevel: TaskLevel,
  parentId?: string
): Task | null => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const raw = item as Record<string, unknown>;
  const id =
    typeof raw.id === "string" && raw.id.trim().length > 0
      ? raw.id
      : generateId();
  const level = isTaskLevel(raw.level) ? raw.level : fallbackLevel;
  const title =
    typeof raw.title === "string" && raw.title.trim().length > 0
      ? raw.title
      : "未定義の目標";
  const description =
    typeof raw.description === "string" && raw.description.trim().length > 0
      ? raw.description
      : undefined;
  const completed = Boolean(raw.completed);
  const createdAt =
    typeof raw.createdAt === "string" && raw.createdAt.trim().length > 0
      ? raw.createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof raw.updatedAt === "string" && raw.updatedAt.trim().length > 0
      ? raw.updatedAt
      : undefined;

  const childSource = Array.isArray(raw.children) ? raw.children : [];
  const nextFallback: TaskLevel = level === "kgi" ? "kpi" : "kai";
  const children =
    level === "kai"
      ? []
      : childSource
          .map((child) => normalizeTask(child, nextFallback, id))
          .filter((child): child is Task => child !== null);

  return {
    id,
    title,
    description,
    completed,
    createdAt,
    updatedAt,
    level,
    parentId,
    children,
  };
};

const normalizeTasks = (data: unknown): Task[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => normalizeTask(item, "kgi"))
    .filter((task): task is Task => task !== null)
    .map((task) =>
      task.level === "kgi"
        ? task
        : { ...task, level: "kgi", parentId: undefined }
    );
};

const createTask = (data: TaskFormData, timestamp: string): Task => ({
  id: generateId(),
  title: data.title,
  description: data.description,
  completed: false,
  createdAt: timestamp,
  updatedAt: undefined,
  level: data.level,
  parentId: data.parentId,
  children: [],
});

export default function Home() {
  const { tasks, setTasks, undo, redo, canUndo, canRedo, isLoaded, isSyncing, isAuthenticated } = useTaskSync();
  const [creationLevel, setCreationLevel] = useState<TaskLevel | null>(null);
  const [summaryInteractionLevels, setSummaryInteractionLevels] = useState<TaskLevel[]>([]);

  const addTask = (data: TaskFormData) => {
    const timestamp = new Date().toISOString();
    const newTask = createTask(data, timestamp);

    setTasks((prev) => {
      if (data.level === "kgi") {
        return [...prev, newTask];
      }

      if (!data.parentId) {
        console.warn("Parent ID is required for non-KGI tasks");
        return prev;
      }

      const updated = addTaskToParent(prev, data.parentId, newTask, timestamp);
      if (updated === prev) {
        console.warn("Failed to locate parent task", data.parentId);
        return prev;
      }
      return updated;
    });
  };

  const addChildTask = (
    parentId: string,
    level: TaskLevel,
    title: string,
    description?: string
  ) => {
    addTask({ title, description, level, parentId });
  };

  const handleRequestCreate = (level: TaskLevel) => {
    setCreationLevel(level);
  };

  const handleCloseDialog = () => {
    setCreationLevel(null);
  };

  const handleSummaryInteractionChange = useCallback(
    (level: TaskLevel, isActive: boolean) => {
      setSummaryInteractionLevels((prev) => {
        if (isActive) {
          if (prev.includes(level)) {
            return prev;
          }
          return [...prev, level];
        }
        return prev.filter((item) => item !== level);
      });
    },
    []
  );

  const hiddenSummaryLevels = useMemo(() => {
    const levels = new Set(summaryInteractionLevels);
    if (creationLevel) {
      levels.add(creationLevel);
    }
    return Array.from(levels);
  }, [creationLevel, summaryInteractionLevels]);

  const toggleTask = (id: string) => {
    const timestamp = new Date().toISOString();
    setTasks((prev) =>
      updateTaskInTree(
        prev,
        id,
        (task) => {
          const completed = !task.completed;
          return task.children.length > 0
            ? cascadeCompletionState(task, completed, timestamp)
            : { ...task, completed, updatedAt: timestamp };
        },
        timestamp
      )
    );
  };

  const deleteTask = (id: string) => {
    const timestamp = new Date().toISOString();
    setTasks((prev) => removeTaskFromTree(prev, id, timestamp));
  };

  const updateTask = (id: string, title: string, description?: string) => {
    const timestamp = new Date().toISOString();
    setTasks((prev) =>
      updateTaskInTree(
        prev,
        id,
        (task) => ({
          ...task,
          title,
          description,
          updatedAt: timestamp,
        }),
        timestamp
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <header className="mb-10 text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
              MTT (Management Task and Todo)
            </h1>
            <div className="flex gap-2">
              {canUndo && (
                <button
                  onClick={undo}
                  className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 flex items-center gap-2"
                  title="一つ前に戻す (Undo)"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  元に戻す
                </button>
              )}
              {canRedo && (
                <button
                  onClick={redo}
                  className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 flex items-center gap-2"
                  title="やり直す (Redo)"
                >
                  やり直す
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <p className="text-base text-gray-600 dark:text-gray-300">
            KGI / KPI / KAI の3層構造でビジネス目標と日々のタスクを一元管理
          </p>
        </header>

        {/* 認証情報表示 */}
        <div className="mb-6">
          <UserInfo />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
          <TaskList
            tasks={tasks}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onUpdateTask={updateTask}
            onAddChildTask={addChildTask}
            onRequestCreate={handleRequestCreate}
            onSummaryInteractionChange={handleSummaryInteractionChange}
            hiddenSummaryLevels={hiddenSummaryLevels}
          />
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
          <AuthPanel />
        </div>

        <footer className="mt-10 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            {isAuthenticated
              ? "データはFirestoreに安全に保存されています。"
              : "データはブラウザのCookieに安全に保存されています。"}
            <br />
            {!isAuthenticated && "ログインするとクラウド同期が有効になります。"}
            {isSyncing && " (同期中...)"}
          </p>
        </footer>
      </div>

      <GoalCreationDialog
        isOpen={creationLevel !== null}
        level={creationLevel ?? "kgi"}
        tasks={tasks}
        onSubmit={addTask}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
