"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";

type FirebaseAuthError = {
  code?: string;
  message: string;
};

function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const { code, message } = error as FirebaseAuthError;
    switch (code) {
      case "auth/popup-closed-by-user":
        return "ウィンドウを閉じたため、Googleログインが中断されました。";
      case "auth/cancelled-popup-request":
        return "別のログイン処理が進行中のため、Googleログインをキャンセルしました。";
      case "auth/popup-blocked":
        return "ブラウザにポップアップがブロックされました。ポップアップを許可して再試行してください。";
      case "auth/email-already-in-use":
        return "このメールアドレスは既に登録されています。ログインをお試しください。";
      case "auth/weak-password":
        return "パスワードは6文字以上で設定してください。";
      case "auth/invalid-email":
        return "メールアドレスの形式が正しくありません。";
      case "auth/missing-email":
        return "メールアドレスを入力してください。";
      case "auth/user-not-found":
        return "アカウントが見つかりません。メールアドレスを確認するか新規登録してください。";
      case "auth/wrong-password":
        return "パスワードが正しくありません。もう一度入力してください。";
      case "auth/too-many-requests":
        return "短時間に試行が集中したため一時的にロックされました。時間をおいて再試行してください。";
      case "auth/network-request-failed":
        return "ネットワークエラーが発生しました。通信環境を確認してください。";
      case "auth/internal-error":
        return "内部エラーが発生しました。時間をおいて再試行してください。";
      default:
        return `認証でエラーが発生しました (${code}).`;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "認証処理中に不明なエラーが発生しました。";
}

export default function AuthPanel() {
  const { user, loading, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"register" | "login">("login");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  // ログアウト完了を検出
  useEffect(() => {
    if (isLoggingOut && !user && !loading) {
      setFeedback("ログアウトしました。");
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, user, loading]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
    } catch (error) {
      console.error("Logout error", error);
      setFeedback("ログアウトに失敗しました。");
      setIsLoggingOut(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    clearFeedback();

    try {
      if (mode === "register") {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const registeredEmail = userCredential.user.email ?? email;

          try {
            const actionCodeSettings =
              typeof window !== "undefined"
                ? { url: window.location.origin }
                : undefined;

            if (actionCodeSettings) {
              await sendEmailVerification(userCredential.user, actionCodeSettings);
            } else {
              await sendEmailVerification(userCredential.user);
            }
            setFeedback(
              `アカウントを作成しました。${registeredEmail} 宛に確認メールを送信しました。メール内のリンクを開いて登録を完了してください。`,
            );
          } catch (verificationError) {
            console.error("Email verification error", verificationError);
            setFeedback(
              "アカウントを作成しましたが、確認メールの送信に失敗しました。時間をおいてから再度ログインし、メール認証をお試しください。",
            );
          }
          setEmail("");
          setPassword("");
        } catch (registerError) {
          console.error("Registration error", registerError);
          const errorMessage = getAuthErrorMessage(registerError);
          setFeedback(errorMessage);
          
          // メールアドレス重複エラーの場合はログインモードへの切り替えを提案
          if (registerError && typeof registerError === "object" && "code" in registerError) {
            const { code } = registerError as FirebaseAuthError;
            if (code === "auth/email-already-in-use") {
              // エラーメッセージは既にgetAuthErrorMessageで設定済み
              // モードは自動で切り替えない（ユーザーの意図を尊重）
            }
          }
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setFeedback("ログインに成功しました。");
        setEmail("");
        setPassword("");
      }
    } catch (error) {
      console.error("Authentication error", error);
      setFeedback(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setSubmitting(true);
      clearFeedback();
      const googleProvider = new GoogleAuthProvider();
      await signInWithPopup(auth, googleProvider);
      setFeedback("Googleアカウントでログインしました。");
    } catch (error) {
      console.error("Google sign-in error", error);
      setFeedback(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        認証情報を読み込んでいます...
      </section>
    );
  }

  if (user) {
    return (
      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">ログイン中</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {user.email || user.displayName || "ログイン済みユーザー"}
          </p>
        </header>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          ログアウト
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 text-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          アカウント作成 / ログイン
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          メールアドレスまたはGoogleアカウントで認証できます。
        </p>
      </header>

      {feedback && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/30 dark:text-blue-200">
          {feedback}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            メールアドレスで{mode === "register" ? "アカウント作成" : "ログイン"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="auth-email">
                メールアドレス
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearFeedback();
                }}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="auth-password">
                パスワード
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearFeedback();
                }}
                required
                minLength={8}
                placeholder="8文字以上のパスワード"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>利用規約とプライバシーポリシーに同意の上お進みください。</span>
              <button
                type="button"
                onClick={() => {
                  clearFeedback();
                  setMode(mode === "register" ? "login" : "register");
                }}
                className="font-semibold text-blue-600 hover:underline dark:text-blue-300"
              >
                {mode === "register" ? "既存アカウントでログイン" : "新規アカウントを作成"}
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 disabled:hover:bg-blue-600"
            >
              {submitting ? "処理中..." : mode === "register" ? "アカウントを作成" : "ログイン"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            シングルサインオン
          </h3>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60 disabled:hover:bg-white dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              aria-label="Googleで続行"
            >
              <span>Googleで続行</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            他の認証プロバイダは順次追加予定です。
          </p>
        </div>
      </div>
    </section>
  );
}
