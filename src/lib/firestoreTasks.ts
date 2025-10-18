import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Unsubscribe,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Task } from "@/types/task";

const COLLECTION_PATH = "tasks";

type SerializedTask = Omit<Task, "createdAt" | "updatedAt" | "children"> & {
  createdAt: string;
  updatedAt: string;
  children: SerializedTask[];
};

function tasksCollection(userId: string) {
  return collection(db, "users", userId, COLLECTION_PATH);
}

function serializeTask(task: Task): SerializedTask {
  const timestamp = new Date().toISOString();

  const serialized: any = {
    id: task.id,
    title: task.title,
    completed: task.completed,
    level: task.level,
    createdAt: task.createdAt ?? timestamp,
    updatedAt: task.updatedAt ?? timestamp,
    children: task.children?.map(serializeTask) ?? [],
  };

  // undefined を除外
  if (task.description !== undefined) {
    serialized.description = task.description;
  }
  if (task.parentId !== undefined) {
    serialized.parentId = task.parentId;
  }
  if (task.order !== undefined) {
    serialized.order = task.order;
  }

  return serialized as SerializedTask;
}

function deserializeTask(data: SerializedTask): Task {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    completed: Boolean(data.completed),
    level: data.level,
    parentId: data.parentId,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
    children: Array.isArray(data.children) ? data.children.map(deserializeTask) : [],
    order: typeof (data as any).order === "number" ? (data as any).order : undefined,
  } as Task;
}

/**
 * タスクとその子タスクをすべてFirestoreに保存
 */
export async function upsertTask(userId: string, task: Task): Promise<void> {
  const taskRef = doc(tasksCollection(userId), task.id);
  await setDoc(taskRef, serializeTask(task), { merge: true });
}

/**
 * 複数のタスクを一括でFirestoreに保存（バッチ処理）
 */
export async function upsertTasksBatch(userId: string, tasks: Task[]): Promise<void> {
  if (tasks.length === 0) return;

  const batch = writeBatch(db);
  tasks.forEach((task) => {
    const taskRef = doc(tasksCollection(userId), task.id);
    batch.set(taskRef, serializeTask(task), { merge: true });
  });

  await batch.commit();
}

/**
 * タスクとその子タスクをすべてFirestoreから削除
 */
export async function removeTask(userId: string, taskId: string): Promise<void> {
  const taskRef = doc(tasksCollection(userId), taskId);
  await deleteDoc(taskRef);
}

/**
 * すべてのタスクを削除（ログアウト時などに使用）
 */
export async function clearAllTasks(userId: string): Promise<void> {
  const tasksQuery = query(tasksCollection(userId));
  const snapshot = await getDocs(tasksQuery);

  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref);
  });

  await batch.commit();
}

/**
 * Firestoreからタスク一覧をリアルタイム購読
 * フラットなタスクリストを階層構造に再構築
 */
export function subscribeTasks(userId: string, callback: (tasks: Task[]) => void): Unsubscribe {
  const tasksQuery = query(tasksCollection(userId), orderBy("createdAt", "asc"));

  return onSnapshot(
    tasksQuery,
    (snapshot) => {
      const flatTasks: Task[] = snapshot.docs
        .map((docSnapshot) => {
          try {
            return deserializeTask(docSnapshot.data() as SerializedTask);
          } catch (error) {
            console.error(`Failed to deserialize task ${docSnapshot.id}:`, error);
            return null;
          }
        })
        .filter((task): task is Task => task !== null)
        .sort((a, b) => {
          // orderフィールドがある場合はそれで並び替え
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          // orderがない場合はcreatedAtで並び替え
          return a.createdAt.localeCompare(b.createdAt);
        });

      // フラットなタスクリストを階層構造に再構築
      const taskMap = new Map<string, Task>();
      flatTasks.forEach(task => {
        taskMap.set(task.id, { ...task, children: [] });
      });

      const rootTasks: Task[] = [];
      flatTasks.forEach(task => {
        const taskWithChildren = taskMap.get(task.id)!;
        if (task.parentId && taskMap.has(task.parentId)) {
          const parent = taskMap.get(task.parentId)!;
          parent.children.push(taskWithChildren);
        } else {
          // parentIdがないか、親が見つからない場合はルートタスク
          rootTasks.push(taskWithChildren);
        }
      });

      callback(rootTasks);
    },
    (error) => {
      console.error("Firestore subscription error:", error);
      callback([]);
    }
  );
}
