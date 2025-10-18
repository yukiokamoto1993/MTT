'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase設定が適切かチェック
    if (!auth || !auth.app) {
      console.error("Firebase auth is not properly initialized");
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let timeoutId: NodeJS.Timeout | undefined;
    let hasResolved = false;

    // 2秒経過しても認証状態が確定しない場合は、強制的にloadingをfalseにする
    // (Firebase初期化が完了していればonAuthStateChangedは即座に呼ばれる)
    timeoutId = setTimeout(() => {
      if (!hasResolved) {
        console.warn("Auth state loading timeout - proceeding without authentication");
        setUser(null);
        setLoading(false);
      }
    }, 2000);

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          hasResolved = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          setUser(firebaseUser);
          setLoading(false);
        },
        (error) => {
          // onAuthStateChangedのエラーハンドラ
          console.error("Auth state change error", error);
          hasResolved = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          setUser(null);
          setLoading(false);
        }
      );
    } catch (error) {
      console.error("Failed to subscribe auth state", error);
      hasResolved = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setUser(null);
      setLoading(false);
    }

    return () => {
      hasResolved = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      signOut,
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
