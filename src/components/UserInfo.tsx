"use client";

import { useAuth } from "@/context/AuthContext";

/**
 * ユーザー認証情報を表示するコンポーネント
 * ページ上部に常に表示され、ログイン状態やユーザー情報を確認できる
 */
export default function UserInfo() {
  const { user, loading } = useAuth();

  // 認証状態の読み込み中は簡潔な表示にする
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div>
          <div className="flex-1">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
            <svg
              className="h-6 w-6 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              ゲストユーザー
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ログインしていません（ローカルストレージを使用）
            </p>
          </div>
        </div>
      </div>
    );
  }

  // プロバイダー情報を取得
  const getAuthProvider = (): string => {
    if (!user.providerData || user.providerData.length === 0) {
      return "メールアドレス";
    }
    
    const providerId = user.providerData[0].providerId;
    switch (providerId) {
      case "google.com":
        return "Google";
      case "password":
        return "メールアドレス";
      case "apple.com":
        return "Apple";
      case "twitter.com":
        return "X (Twitter)";
      default:
        return providerId;
    }
  };

  const provider = getAuthProvider();
  const displayName = user.displayName || "名前未設定";
  const email = user.email || "メールアドレス未設定";
  const photoURL = user.photoURL;
  const emailVerified = user.emailVerified;

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 shadow-sm dark:border-green-900/30 dark:bg-green-900/20">
      <div className="flex items-center gap-3">
        {/* プロフィール画像またはアイコン */}
        {photoURL ? (
          <img
            src={photoURL}
            alt={displayName}
            className="h-10 w-10 rounded-full border-2 border-green-300 dark:border-green-700"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-300 bg-green-200 dark:border-green-700 dark:bg-green-800">
            <span className="text-lg font-semibold text-green-700 dark:text-green-300">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* ユーザー情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-green-900 dark:text-green-100 truncate">
              {displayName}
            </p>
            {emailVerified && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-800 dark:text-green-200"
                title="メールアドレスが確認済み"
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                確認済
              </span>
            )}
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 truncate">
            {email}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
            <span className="inline-flex items-center gap-1">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              {provider}アカウントでログイン中
            </span>
          </p>
        </div>

        {/* ステータスバッジ */}
        <div className="flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-200 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-800 dark:text-green-200">
            <span className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400 animate-pulse"></span>
            オンライン
          </span>
        </div>
      </div>
    </div>
  );
}
