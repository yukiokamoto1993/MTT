'use client';

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeTasks, upsertTask, removeTask } from "@/lib/firestoreTasks";
import Cookies from "js-cookie";
import type { Task } from "@/types/task";

const COOKIE_KEY = "tasks";
const MIGRATION_FLAG_KEY = "tasks_migrated_to_firestore";
const HISTORY_KEY = "tasks_history";
const REDO_HISTORY_KEY = "tasks_redo_history";
const MAX_HISTORY = 20; // 最大20個の履歴を保持

/**
 * ログイン状態に応じてタスクをCookieまたはFirestoreから管理するカスタムフック
 */
export function useTaskSync() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [history, setHistory] = useState<Task[][]>([]);
  const [redoHistory, setRedoHistory] = useState<Task[][]>([]);

  // 初回ロード: Cookieからタスクを読み込み
  useEffect(() => {
    if (authLoading) return;

    const savedTasks = Cookies.get(COOKIE_KEY);
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        setTasks(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error("Failed to parse tasks from cookies:", error);
        setTasks([]);
      }
    }

    // 履歴を読み込み
    const savedHistory = Cookies.get(HISTORY_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error("Failed to parse history from cookies:", error);
        setHistory([]);
      }
    }

    // Redo履歴を読み込み
    const savedRedoHistory = Cookies.get(REDO_HISTORY_KEY);
    if (savedRedoHistory) {
      try {
        const parsed = JSON.parse(savedRedoHistory);
        setRedoHistory(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error("Failed to parse redo history from cookies:", error);
        setRedoHistory([]);
      }
    }

    setIsLoaded(true);
  }, [authLoading]);

  // ログイン時: CookieからFirestoreへ移行
  useEffect(() => {
    if (!user || !isLoaded) {
      // ログアウト時: Firestore購読をクリーンアップ
      if (unsubscribeRef.current) {
        console.log("Unsubscribing from Firestore (logged out)");
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    const migrated = Cookies.get(MIGRATION_FLAG_KEY);
    if (migrated === "true") {
      // 既に移行済み: Firestoreから購読開始
      console.log("Subscribing to Firestore (already migrated)");
      const unsubscribe = subscribeTasks(user.uid, (firestoreTasks) => {
        setTasks(firestoreTasks);
      });
      unsubscribeRef.current = unsubscribe;
      
      return () => {
        if (unsubscribeRef.current) {
          console.log("Cleaning up Firestore subscription");
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }

    // 未移行: Cookieのタスクを Firestore へ移行
    const savedTasks = Cookies.get(COOKIE_KEY);
    let cookieTasks: Task[] = [];
    
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        cookieTasks = Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Failed to parse tasks from cookies:", error);
      }
    }

    if (cookieTasks.length === 0) {
      // タスクがない場合は移行完了とマーク
      console.log("No tasks to migrate, subscribing to Firestore");
      Cookies.set(MIGRATION_FLAG_KEY, "true", { expires: 365 });
      const unsubscribe = subscribeTasks(user.uid, (firestoreTasks) => {
        setTasks(firestoreTasks);
      });
      unsubscribeRef.current = unsubscribe;
      
      return () => {
        if (unsubscribeRef.current) {
          console.log("Cleaning up Firestore subscription");
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }

    // タスクがある場合は移行実行
    console.log(`Migrating ${cookieTasks.length} tasks to Firestore`);
    setIsSyncing(true);
    
    const migrationPromise = Promise.all(
      cookieTasks.map((task) => upsertTask(user.uid, task))
    )
      .then(() => {
        console.log(`Migrated ${cookieTasks.length} tasks to Firestore`);
        Cookies.set(MIGRATION_FLAG_KEY, "true", { expires: 365 });
        Cookies.remove(COOKIE_KEY); // Cookie削除
        setIsSyncing(false);

        // 移行後、Firestoreから購読開始
        const unsubscribe = subscribeTasks(user.uid, (firestoreTasks) => {
          setTasks(firestoreTasks);
        });
        unsubscribeRef.current = unsubscribe;
      })
      .catch((error) => {
        console.error("Failed to migrate tasks to Firestore:", error);
        setIsSyncing(false);
      });

    // クリーンアップ関数
    return () => {
      migrationPromise.then(() => {
        if (unsubscribeRef.current) {
          console.log("Cleaning up Firestore subscription after migration");
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      });
    };
  }, [user, isLoaded]);

  // ログアウト時: Cookieを削除（Firestoreにデータが保存されているため）
  useEffect(() => {
    if (!user && isLoaded && !authLoading) {
      // ログアウト状態ではCookieをクリアして、ローカルのタスクもクリア
      console.log("Clearing cookies and local tasks after logout");
      Cookies.remove(COOKIE_KEY);
      Cookies.remove(MIGRATION_FLAG_KEY);
      setTasks([]); // ローカル状態もクリア
    }
  }, [user, isLoaded, authLoading]);

  // タスク保存関数（履歴付き）
  const saveTasks = async (newTasksOrUpdater: Task[] | ((prev: Task[]) => Task[]), saveToHistory = true) => {
    const prevTasks = tasks;
    const newTasks = typeof newTasksOrUpdater === 'function' 
      ? newTasksOrUpdater(prevTasks) 
      : newTasksOrUpdater;
    
    // 履歴に追加（変更があった場合のみ）
    if (saveToHistory && JSON.stringify(prevTasks) !== JSON.stringify(newTasks)) {
      const newHistory = [...history, prevTasks].slice(-MAX_HISTORY);
      setHistory(newHistory);
      // 履歴をCookieに保存
      Cookies.set(HISTORY_KEY, JSON.stringify(newHistory), { expires: 365 });
      
      // 新しい変更があった場合はRedoスタックをクリア
      setRedoHistory([]);
      Cookies.remove(REDO_HISTORY_KEY);
    }

    // ローカル状態を更新
    setTasks(newTasks);
    setTasks(newTasks);

    // ログイン中かつFirestoreリスナーが動作していない場合のみFirestoreに保存
    // リスナーが動作中の場合は、ローカルでの編集操作時のみ保存が必要
    if (user && !isSyncing) {
      // すべてのタスクIDを収集（子タスクも含む）
      const collectAllIds = (taskList: Task[]): Set<string> => {
        const ids = new Set<string>();
        const traverse = (task: Task) => {
          ids.add(task.id);
          task.children.forEach(traverse);
        };
        taskList.forEach(traverse);
        return ids;
      };

      const prevIds = collectAllIds(prevTasks);
      const newIds = collectAllIds(newTasks);

      // 削除されたタスクのIDを特定
      const deletedIds = Array.from(prevIds).filter(id => !newIds.has(id));

      // 削除されたタスクをFirestoreから削除
      if (deletedIds.length > 0) {
        console.log(`Deleting ${deletedIds.length} tasks from Firestore:`, deletedIds);
        await Promise.all(
          deletedIds.map((taskId) => removeTask(user.uid, taskId))
        );
      }

      // すべてのタスクを収集（子タスクも含む）してFirestoreに保存
      const flattenTasks = (taskList: Task[]): Task[] => {
        const result: Task[] = [];
        const traverse = (task: Task) => {
          result.push(task);
          task.children.forEach(traverse);
        };
        taskList.forEach(traverse);
        return result;
      };

      const allTasks = flattenTasks(newTasks);
      console.log(`Saving ${allTasks.length} tasks to Firestore`);
      await Promise.all(
        allTasks.map((task) => upsertTask(user.uid, task))
      );
    } else if (!user) {
      // 未ログイン: Cookieに保存
      Cookies.set(COOKIE_KEY, JSON.stringify(newTasks), { expires: 365 });
    }
  };

  // タスク削除関数
  const deleteTaskById = async (taskId: string) => {
    if (user) {
      try {
        await removeTask(user.uid, taskId);
      } catch (error) {
        console.error("Failed to delete task from Firestore:", error);
      }
    }
  };

  // Undo機能（一つ前に戻す）
  const undo = async () => {
    if (history.length === 0) {
      console.warn("No history to undo");
      return false;
    }

    const previousState = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    // 現在の状態をRedoスタックに追加
    const newRedoHistory = [...redoHistory, tasks].slice(-MAX_HISTORY);
    
    setHistory(newHistory);
    setRedoHistory(newRedoHistory);
    Cookies.set(HISTORY_KEY, JSON.stringify(newHistory), { expires: 365 });
    Cookies.set(REDO_HISTORY_KEY, JSON.stringify(newRedoHistory), { expires: 365 });

    // 履歴に保存せずにタスクを復元
    await saveTasks(previousState, false);
    return true;
  };

  // Redo機能（やり直す）
  const redo = async () => {
    if (redoHistory.length === 0) {
      console.warn("No redo history");
      return false;
    }

    const nextState = redoHistory[redoHistory.length - 1];
    const newRedoHistory = redoHistory.slice(0, -1);
    
    // 現在の状態をUndoスタックに追加
    const newHistory = [...history, tasks].slice(-MAX_HISTORY);
    
    setHistory(newHistory);
    setRedoHistory(newRedoHistory);
    Cookies.set(HISTORY_KEY, JSON.stringify(newHistory), { expires: 365 });
    Cookies.set(REDO_HISTORY_KEY, JSON.stringify(newRedoHistory), { expires: 365 });

    // 履歴に保存せずにタスクを復元
    await saveTasks(nextState, false);
    return true;
  };

  return {
    tasks,
    setTasks: saveTasks,
    deleteTask: deleteTaskById,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: redoHistory.length > 0,
    isLoaded: isLoaded && !authLoading,
    isSyncing,
    isAuthenticated: !!user,
  };
}
