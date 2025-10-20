"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TaskList from "@/components/TaskList";
import GoalCreationDialog from "@/components/TaskForm";
import AuthPanel from "@/components/AuthPanel";
import UserInfo from "@/components/UserInfo";
import { Task, TaskFormData, TaskLevel, TASK_LEVEL_FLOW } from "@/types/task";
import { useTaskSync } from "@/hooks/useTaskSync";
import {
  getAllTaskIds,
  findTaskById,
  findParentTask,
  removeTaskFromTree as removeTaskHelper,
  insertTaskIntoTree,
  reorderTasks,
  canMoveToParent,
  isDescendant,
} from "@/lib/dragDropHelpers";

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
      const newTaskWithOrder = {
        ...newTask,
        order: task.children.length,
      };
      return {
        ...task,
        updatedAt: timestamp,
        children: [...task.children, newTaskWithOrder],
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
  const order = typeof raw.order === "number" ? raw.order : 0;

  const childSource = Array.isArray(raw.children) ? raw.children : [];
  const nextFallback: TaskLevel = level === "kgi" ? "kpi" : "kai";
  const children =
    level === "kai"
      ? []
      : childSource
          .map((child, index) => normalizeTask(child, nextFallback, id))
          .filter((child): child is Task => child !== null)
          .map((child, index) => ({ ...child, order: child.order || index }));

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
    order,
  };
};

const normalizeTasks = (data: unknown): Task[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => normalizeTask(item, "kgi"))
    .filter((task): task is Task => task !== null)
    .map((task, index) =>
      task.level === "kgi"
        ? { ...task, order: task.order || index }
        : { ...task, level: "kgi", parentId: undefined, order: task.order || index }
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
  order: 0,
});

export default function Home() {
  const { tasks, setTasks, undo, redo, canUndo, canRedo, isLoaded, isSyncing, isAuthenticated } = useTaskSync();
  const [creationLevel, setCreationLevel] = useState<TaskLevel | null>(null);
  const [summaryInteractionLevels, setSummaryInteractionLevels] = useState<TaskLevel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const taskIds = useMemo(() => getAllTaskIds(tasks), [tasks]);
  const activeTask = activeId ? findTaskById(tasks, activeId) : null;
  const overTask = overId ? findTaskById(tasks, overId) : null;

  // ドロップ可能かどうかを判定
  const isDroppable = useMemo(() => {
    if (!activeTask || !overTask || activeId === overId) {
      return false;
    }

    // 自分自身の子孫にはドロップ不可
    if (isDescendant(tasks, activeId!, overId!)) {
      return false;
    }

    // 同じレベルの場合は常にドロップ可能（並び替え）
    if (activeTask.level === overTask.level) {
      return true;
    }

    // 異なるレベルの場合: overTaskの子にできるか確認
    const nextLevel = TASK_LEVEL_FLOW[overTask.level];
    return nextLevel === activeTask.level;
  }, [activeTask, overTask, activeId, overId, tasks]);

  const addTask = (data: TaskFormData) => {
    const timestamp = new Date().toISOString();
    const newTask = createTask(data, timestamp);

    setTasks((prev) => {
      if (data.level === "kgi") {
        const newTaskWithOrder = {
          ...newTask,
          order: prev.length,
        };
        return [...prev, newTaskWithOrder];
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    setTasks((prevTasks) => {
      const activeTask = findTaskById(prevTasks, activeId);
      const overTask = findTaskById(prevTasks, overId);

      if (!activeTask || !overTask) {
        return prevTasks;
      }

      // 自分自身の子孫にはドロップできない
      if (isDescendant(prevTasks, activeId, overId)) {
        return prevTasks;
      }

      const activeParent = findParentTask(prevTasks, activeId);
      const overParent = findParentTask(prevTasks, overId);

      // レベル制約チェック: activeTaskとoverTaskが同じレベルの場合
      if (activeTask.level === overTask.level) {
        // 同じレベルのタスク間での移動
        // overTaskと同じ親の子として追加（並び替え）
        const { newTasks: tasksAfterRemoval, removedTask } = removeTaskHelper(prevTasks, activeId);
        if (!removedTask) return prevTasks;

        const targetParentId = overParent?.id || null;
        let insertIndex = 0;

        if (targetParentId === null) {
          // ルートレベル
          insertIndex = tasksAfterRemoval.findIndex(t => t.id === overId);
          if (insertIndex === -1) insertIndex = tasksAfterRemoval.length;
        } else {
          // 親の子として
          const parent = findTaskById(tasksAfterRemoval, targetParentId);
          if (parent) {
            insertIndex = parent.children.findIndex(t => t.id === overId);
            if (insertIndex === -1) insertIndex = parent.children.length;
          }
        }

        const updatedTask = {
          ...removedTask,
          parentId: targetParentId || undefined,
          updatedAt: new Date().toISOString(),
        };

        const newTasks = insertTaskIntoTree(tasksAfterRemoval, updatedTask, targetParentId, insertIndex);
        return reorderTasks(newTasks);
      }

      // 異なるレベル間の移動: overTaskの子にする場合
      const nextLevel = TASK_LEVEL_FLOW[overTask.level];
      
      // overTaskが子を持てて、activeTaskが適切なレベルの場合
      if (nextLevel && activeTask.level === nextLevel) {
        const { newTasks: tasksAfterRemoval, removedTask } = removeTaskHelper(prevTasks, activeId);
        if (!removedTask) return prevTasks;

        const updatedTask = {
          ...removedTask,
          parentId: overId,
          updatedAt: new Date().toISOString(),
        };

        // overTaskの子の最後に追加
        const newTasks = insertTaskIntoTree(tasksAfterRemoval, updatedTask, overId, overTask.children.length);
        return reorderTasks(newTasks);
      }

      // それ以外の場合は移動不可
      return prevTasks;
    });
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto max-w-5xl px-4 py-10">
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-3">
              MTT (Management Task and Todo)
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300">
              KGI / KPI / KAI の3層構造でビジネス目標と日々のタスクを一元管理
            </p>
          </header>

          {/* 認証情報表示 */}
          <div className="mb-6">
            <UserInfo />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              <TaskList
                tasks={tasks}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
                onUpdateTask={updateTask}
                onAddChildTask={addChildTask}
                onRequestCreate={handleRequestCreate}
                onSummaryInteractionChange={handleSummaryInteractionChange}
                hiddenSummaryLevels={hiddenSummaryLevels}
                activeId={activeId}
                overId={overId}
                isDroppable={isDroppable}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
              />
            </SortableContext>
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
      </div>

      <GoalCreationDialog
        isOpen={creationLevel !== null}
        level={creationLevel ?? "kgi"}
        tasks={tasks}
        onSubmit={addTask}
        onClose={handleCloseDialog}
      />

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-95">
            <div 
              className={`rounded-lg border-2 p-4 shadow-2xl transition-all ${
                isDroppable 
                  ? "border-green-500 bg-green-50 dark:bg-green-900/30 ring-2 ring-green-400" 
                  : overId 
                    ? "border-red-500 bg-red-50 dark:bg-red-900/30 ring-2 ring-red-400"
                    : "border-blue-500 bg-white dark:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span 
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isDroppable
                      ? "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200"
                      : overId
                        ? "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                  }`}
                >
                  {activeTask.level.toUpperCase()}
                </span>
                <p className="font-semibold text-gray-800 dark:text-white">{activeTask.title}</p>
              </div>
              {isDroppable && (
                <div className="mt-2 flex items-center gap-1 text-xs text-green-700 dark:text-green-300">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>ドロップ可能</span>
                </div>
              )}
              {overId && !isDroppable && (
                <div className="mt-2 flex items-center gap-1 text-xs text-red-700 dark:text-red-300">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>ドロップ不可</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
