import { Task, TaskLevel, TASK_LEVEL_FLOW } from "@/types/task";

/**
 * タスクツリーをフラット化してID配列を取得
 */
export function getAllTaskIds(tasks: Task[]): string[] {
  const ids: string[] = [];
  function traverse(items: Task[]) {
    items.forEach(task => {
      ids.push(task.id);
      if (task.children.length > 0) {
        traverse(task.children);
      }
    });
  }
  traverse(tasks);
  return ids;
}

/**
 * タスクIDからタスクを検索
 */
export function findTaskById(tasks: Task[], id: string): Task | null {
  for (const task of tasks) {
    if (task.id === id) {
      return task;
    }
    if (task.children.length > 0) {
      const found = findTaskById(task.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * タスクの親を検索
 */
export function findParentTask(tasks: Task[], taskId: string): Task | null {
  for (const task of tasks) {
    if (task.children.some(child => child.id === taskId)) {
      return task;
    }
    if (task.children.length > 0) {
      const found = findParentTask(task.children, taskId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * タスクを削除して新しいツリーを返す
 */
export function removeTaskFromTree(tasks: Task[], taskId: string): { newTasks: Task[]; removedTask: Task | null } {
  let removedTask: Task | null = null;

  function remove(items: Task[]): Task[] {
    const result: Task[] = [];
    for (const task of items) {
      if (task.id === taskId) {
        removedTask = task;
        continue;
      }
      result.push({
        ...task,
        children: task.children.length > 0 ? remove(task.children) : task.children,
      });
    }
    return result;
  }

  return {
    newTasks: remove(tasks),
    removedTask,
  };
}

/**
 * タスクを指定位置に挿入
 */
export function insertTaskIntoTree(
  tasks: Task[],
  task: Task,
  parentId: string | null,
  index: number
): Task[] {
  // ルートレベルに挿入
  if (parentId === null) {
    const newTasks = [...tasks];
    newTasks.splice(index, 0, task);
    return reorderTasks(newTasks);
  }

  // 親タスクの子として挿入
  function insert(items: Task[]): Task[] {
    return items.map(item => {
      if (item.id === parentId) {
        const newChildren = [...item.children];
        newChildren.splice(index, 0, { ...task, parentId: item.id });
        return {
          ...item,
          children: reorderTasks(newChildren),
        };
      }
      if (item.children.length > 0) {
        return {
          ...item,
          children: insert(item.children),
        };
      }
      return item;
    });
  }

  return insert(tasks);
}

/**
 * タスクのorder値を再計算
 */
export function reorderTasks(tasks: Task[]): Task[] {
  return tasks.map((task, index) => ({
    ...task,
    order: index,
    children: task.children.length > 0 ? reorderTasks(task.children) : task.children,
  }));
}

/**
 * レベル制約をチェック（KGI > KPI > KAIの階層）
 */
export function canMoveToParent(taskLevel: TaskLevel, parentLevel: TaskLevel | null): boolean {
  if (parentLevel === null) {
    // ルートレベルはKGIのみ
    return taskLevel === "kgi";
  }

  const expectedChildLevel = TASK_LEVEL_FLOW[parentLevel];
  return expectedChildLevel === taskLevel;
}

/**
 * ドラッグ中のタスクが子孫かチェック
 */
export function isDescendant(tasks: Task[], ancestorId: string, descendantId: string): boolean {
  const ancestor = findTaskById(tasks, ancestorId);
  if (!ancestor) return false;

  function checkDescendant(task: Task): boolean {
    if (task.id === descendantId) return true;
    return task.children.some(checkDescendant);
  }

  return checkDescendant(ancestor);
}
