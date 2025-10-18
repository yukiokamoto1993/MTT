export type TaskLevel = "kgi" | "kpi" | "kai";

export const TASK_LEVEL_SEQUENCE: TaskLevel[] = ["kgi", "kpi", "kai"];

export const TASK_LEVEL_FLOW: Record<TaskLevel, TaskLevel | null> = {
  kgi: "kpi",
  kpi: "kai",
  kai: null,
};

export const TASK_LEVEL_LABELS: Record<
  TaskLevel,
  { short: string; long: string; description: string }
> = {
  kgi: {
    short: "KGI",
    long: "長期目標",
    description: "組織全体のゴール",
  },
  kpi: {
    short: "KPI",
    long: "中期指標",
    description: "KGI達成のための主要成果指標",
  },
  kai: {
    short: "KAI",
    long: "短期アクション",
    description: "日々の実行タスク",
  },
};

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  level: TaskLevel;
  parentId?: string;
  children: Task[];
  order?: number; // ドラッグ&ドロップの順序を保持
}

export interface TaskFormData {
  title: string;
  description?: string;
  level: TaskLevel;
  parentId?: string;
}
