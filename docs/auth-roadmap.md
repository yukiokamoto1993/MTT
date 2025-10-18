# Firebase Authentication 実装ロードマップ

このドキュメントでは、MTT (Management Task and Todo) におけるFirebase Authenticationを使用した認証実装のステップを整理します。

## 現状
- フロントエンドのUIのみ実装済み（`AuthPanel` コンポーネント）
- Firebase SDKは未統合
- Cookieベースのローカルデータ保存を継続

## 選定した認証基盤: Firebase Authentication

### 選定理由
- **マルチプロバイダ対応**: Google, Email/Password, Apple, Twitter, LINE等を統一的に管理
- **簡単な統合**: Next.jsとの相性が良く、クライアントサイドSDKが充実
- **セキュリティ**: Googleが提供する堅牢な認証基盤
- **無料枠**: 月10,000回の認証まで無料（小規模プロジェクトに最適）
- **Firestore連携**: 同じFirebaseエコシステムでシームレスに統合可能
- **ホスティング統合**: Firebase Hostingと組み合わせて簡単デプロイ

## ステップ1: Firebase プロジェクトのセットアップ

### 1.1 Firebaseプロジェクト作成
1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名: `MTT` (または任意の名前)
4. Google Analyticsの設定（オプション）
5. プロジェクト作成完了

### 1.2 Firebase SDK の追加
1. Firebase Console → プロジェクト設定 → マイアプリ
2. Webアプリを追加（`</>`アイコン）
3. アプリのニックネーム: `MTT Web App`
4. Firebase Hostingの設定（オプション）
5. 設定情報をコピー

```typescript
// Firebase設定（後で .env.local に保存）
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXXXX"
};
```

## ステップ2: 認証プロバイダの設定

### 2.1 Google認証
1. Firebase Console → Authentication → Sign-in method
2. 「Google」を選択
3. 有効にするをクリック
4. プロジェクトのサポートメールを選択
5. 保存

**実装コード例:**
```typescript
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const auth = getAuth();
const provider = new GoogleAuthProvider();

const handleGoogleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log('Logged in:', user);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 2.2 メール/パスワード認証
1. Firebase Console → Authentication → Sign-in method
2. 「メール/パスワード」を選択
3. 有効にするをクリック
4. 「メールリンク（パスワードなしでログイン）」も必要に応じて有効化
5. 保存

**実装コード例:**
```typescript
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword 
} from 'firebase/auth';

const auth = getAuth();

// 新規登録
const handleSignUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('User created:', userCredential.user);
  } catch (error) {
    console.error('Error:', error);
  }
};

// ログイン
const handleSignIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('User signed in:', userCredential.user);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 2.3 Apple Sign In
1. [Apple Developer Program](https://developer.apple.com/) に登録（有料）
2. Sign in with Appleの設定
   - Service ID作成
   - キーファイル(.p8)のダウンロード
   - リターンURLの設定
3. Firebase Console → Authentication → Sign-in method
4. 「Apple」を選択して有効化
5. Service ID、Team ID、Key IDを入力

**実装コード例:**
```typescript
import { getAuth, signInWithPopup, OAuthProvider } from 'firebase/auth';

const auth = getAuth();
const provider = new OAuthProvider('apple.com');
provider.addScope('email');
provider.addScope('name');

const handleAppleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log('Logged in with Apple:', user);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 2.4 X (Twitter) 認証
1. [X Developer Portal](https://developer.twitter.com/) でアプリを作成
2. OAuth 2.0設定を有効化
3. コールバックURL設定: `https://your-project.firebaseapp.com/__/auth/handler`
4. Client ID と Client Secret を取得
5. Firebase Console → Authentication → Sign-in method
6. 「Twitter」を選択して有効化し、認証情報を入力

**実装コード例:**
```typescript
import { getAuth, signInWithPopup, TwitterAuthProvider } from 'firebase/auth';

const auth = getAuth();
const provider = new TwitterAuthProvider();

const handleTwitterSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log('Logged in with X:', user);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 2.5 LINE ログイン
1. [LINE Developers Console](https://developers.line.biz/console/) でチャネルを作成
2. チャネル基本設定でCallback URLを設定
3. Firebase Authentication は直接LINEをサポートしていないため、カスタム認証を実装
4. LINE Login APIを使用してアクセストークンを取得
5. Firebase Custom Tokenを生成してサインイン

**実装の注意:**
- LINEは Firebase の標準プロバイダではないため、サーバーサイドでカスタム認証トークンを生成する必要があります
- Next.js API Routes + Firebase Admin SDKを使用

```typescript
// pages/api/auth/line-callback.ts (サーバーサイド)
import { getAuth } from 'firebase-admin/auth';

export default async function handler(req, res) {
  const { code } = req.query;
  
  // LINE APIでアクセストークンを取得
  const lineToken = await exchangeCodeForToken(code);
  
  // LINEプロフィール取得
  const profile = await getLineProfile(lineToken);
  
  // Firebase Custom Token作成
  const customToken = await getAuth().createCustomToken(profile.userId);
  
  res.json({ customToken });
}
```

## ステップ3: Next.jsプロジェクトへの統合

### 3.1 必要なパッケージのインストール
```bash
npm install firebase
```

### 3.2 Firebase初期化ファイルの作成
`src/lib/firebase.ts` を作成:

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// 既に初期化されていないか確認（Hot Reloadでの重複防止）
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
```

### 3.3 環境変数の設定
`.env.local` ファイルを作成:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**重要**: `.env.local` は `.gitignore` に追加してコミットしないこと！

### 3.4 認証コンテキストの作成
`src/context/AuthContext.tsx` を作成:

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 3.5 ルートレイアウトへの統合
`src/app/layout.tsx` を更新:

```typescript
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## ステップ4: AuthPanel コンポーネントの更新

既存の `AuthPanel.tsx` を Firebase Authentication に対応させます。

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  OAuthProvider,
  TwitterAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AuthPanel() {
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Google ログイン
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google sign in error:', error);
      alert('Googleログインに失敗しました');
    }
  };

  // メール/パスワード ログイン or 登録
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error('Email auth error:', error);
      alert(error.message);
    }
  };

  // Apple ログイン
  const handleAppleSignIn = async () => {
    try {
      const provider = new OAuthProvider('apple.com');
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Apple sign in error:', error);
      alert('Appleログインに失敗しました');
    }
  };

  // X (Twitter) ログイン
  const handleTwitterSignIn = async () => {
    try {
      const provider = new TwitterAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Twitter sign in error:', error);
      alert('Xログインに失敗しました');
    }
  };

  // LINE ログイン（準備中）
  const handleLineSignIn = () => {
    alert('LINEログインは準備中です');
  };

  if (user) {
    return (
      <div className="auth-panel">
        <p>ログイン中: {user.email || user.displayName}</p>
        <button onClick={signOut}>ログアウト</button>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <h2>ログイン / 新規登録</h2>
      
      {/* メール/パスワード */}
      <form onSubmit={handleEmailAuth}>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">
          {isSignUp ? '新規登録' : 'ログイン'}
        </button>
        <button type="button" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'ログインに切り替え' : '新規登録に切り替え'}
        </button>
      </form>

      {/* ソーシャルログイン */}
      <div className="social-login">
        <button onClick={handleGoogleSignIn}>Googleでログイン</button>
        <button onClick={handleAppleSignIn}>Appleでログイン</button>
        <button onClick={handleTwitterSignIn}>Xでログイン</button>
        <button onClick={handleLineSignIn}>LINEでログイン（準備中）</button>
      </div>
    </div>
  );
}
```

## ステップ5: Firestore へのデータ移行

### 5.1 Firestore データベースの作成
1. Firebase Console → Firestore Database
2. 「データベースを作成」をクリック
3. ロケーション選択（asia-northeast1 推奨）
4. テストモードで開始（後でセキュリティルールを設定）

### 5.2 セキュリティルールの設定
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のタスクのみ読み書き可能
    match /users/{userId}/tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // ユーザープロフィール
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5.3 Cookie → Firestore 移行関数
`src/lib/migrateTasks.ts` を作成:

```typescript
import { collection, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import Cookies from 'js-cookie';
import { Task } from '@/types/task';

export async function migrateTasksToFirestore(userId: string) {
  try {
    // Cookieからタスクデータを取得
    const cookieData = Cookies.get('tasks');
    if (!cookieData) {
      console.log('No tasks to migrate');
      return;
    }

    const tasks: Task[] = JSON.parse(cookieData);
    
    if (tasks.length === 0) {
      console.log('No tasks to migrate');
      return;
    }

    // Batch write で一括保存
    const batch = writeBatch(db);
    const tasksRef = collection(db, 'users', userId, 'tasks');

    tasks.forEach((task) => {
      const taskDoc = doc(tasksRef, task.id);
      batch.set(taskDoc, {
        ...task,
        createdAt: Timestamp.fromDate(new Date(task.createdAt)),
        updatedAt: task.updatedAt ? Timestamp.fromDate(new Date(task.updatedAt)) : null,
      });
    });

    await batch.commit();
    console.log(`Successfully migrated ${tasks.length} tasks to Firestore`);

    // 移行完了後、Cookieをクリア（またはバックアップフラグを立てる）
    Cookies.remove('tasks');
    Cookies.set('tasks_migrated', 'true', { expires: 365 });
    
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}
```

### 5.4 Firestoreからのデータ読み込み
`src/hooks/useFirestoreTasks.ts` を作成:

```typescript
import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task } from '@/types/task';
import { useAuth } from '@/context/AuthContext';

export function useFirestoreTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    // リアルタイムリスナーを設定
    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData: Task[] = [];
      snapshot.forEach((doc) => {
        tasksData.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate().toISOString(),
          updatedAt: doc.data().updatedAt?.toDate().toISOString(),
        } as Task);
      });
      setTasks(tasksData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { tasks, loading };
}
```

### 5.5 タスク作成・更新・削除
`src/lib/firestoreOperations.ts` を作成:

```typescript
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Task } from '@/types/task';

export async function createTask(userId: string, task: Omit<Task, 'id'>) {
  const tasksRef = collection(db, 'users', userId, 'tasks');
  const docRef = await addDoc(tasksRef, {
    ...task,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateTask(userId: string, taskId: string, updates: Partial<Task>) {
  const taskRef = doc(db, 'users', userId, 'tasks', taskId);
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteTask(userId: string, taskId: string) {
  const taskRef = doc(db, 'users', userId, 'tasks', taskId);
  await deleteDoc(taskRef);
}
```

## ステップ6: セキュリティと運用

### 6.1 セキュリティベストプラクティス
- **Firestore Security Rules**: 必ず本番環境では厳格なルールを設定
- **環境変数の管理**: `.env.local` はGitにコミットしない
- **Firebase App Check**: ボット対策のため有効化を検討
- **Rate Limiting**: Firestore のクォータ制限を監視
- **エラーハンドリング**: 認証エラーを適切にユーザーに表示

### 6.2 プライバシーポリシー・利用規約
各認証プロバイダの要件:
- **Google**: プライバシーポリシーの掲載必須
- **Apple**: プライバシーポリシーと利用規約の両方必須
- **LINE**: プライバシーポリシー必須
- **X (Twitter)**: 利用規約推奨

### 6.3 監査ログ
Firebase Authentication はデフォルトで以下を記録:
- ログイン試行
- パスワード変更
- アカウント作成・削除

Firebase Console → Authentication → Users で確認可能

### 6.4 アカウント停止・削除
```typescript
import { deleteUser } from 'firebase/auth';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';

// アカウント削除（ユーザー側）
export async function deleteAccount(user: User) {
  try {
    // 1. Firestoreのユーザーデータを削除
    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const snapshot = await getDocs(tasksRef);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // 2. Firebase Authenticationからユーザーを削除
    await deleteUser(user);
    
  } catch (error) {
    console.error('Delete account error:', error);
    throw error;
  }
}
```

## ステップ7: テストとデプロイ

### 7.1 ローカルテスト
```bash
# 開発サーバー起動
npm run dev

# Firebase Emulator（オプション）
firebase emulators:start
```

### 7.2 Firebase Hosting へデプロイ
```bash
# ビルド
npm run build

# デプロイ
firebase deploy
```

### 7.3 本番環境の環境変数設定
Firebase Hosting では環境変数を直接設定できないため、以下の方法を使用:
1. Next.js の `next.config.js` で `NEXT_PUBLIC_` 変数を設定
2. ビルド時に環境変数を埋め込む
3. Firebase Remote Config（動的設定用）

## トラブルシューティング

### よくある問題

#### 1. "Firebase: Error (auth/popup-blocked)"
→ ポップアップがブロックされている。ユーザーにポップアップ許可を依頼

#### 2. "Firebase: Error (auth/unauthorized-domain)"
→ Firebase Console → Authentication → Settings → Authorized domains にドメインを追加

#### 3. "Firebase: Error (auth/operation-not-allowed)"
→ Firebase Console で該当の認証方法を有効化

#### 4. Firestore Permission Denied
→ Security Rules を確認。テスト時は一時的に読み書きを許可

```javascript
// テスト用（本番では使用しないこと）
allow read, write: if true;
```
## 参考資料

### 公式ドキュメント
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Web SDK ガイド](https://firebase.google.com/docs/web/setup)
- [Firestore セキュリティルール](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Hosting ガイド](https://firebase.google.com/docs/hosting)

### プロバイダ別ドキュメント
- [Google Identity Platform](https://developers.google.com/identity)
- [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)
- [X (Twitter) OAuth 2.0](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [LINE Login ガイド](https://developers.line.biz/ja/docs/line-login/overview/)

### Next.js + Firebase 統合
- [Next.js with Firebase](https://github.com/vercel/next.js/tree/canary/examples/with-firebase)
- [Firebase と Next.js App Router](https://firebase.google.com/docs/web/frameworks/nextjs)

## 実装チェックリスト

- [ ] Firebase プロジェクト作成
- [ ] Web アプリ登録
- [ ] Authentication 有効化
  - [ ] Google
  - [ ] Email/Password
  - [ ] Apple
  - [ ] X (Twitter)
  - [ ] LINE（カスタム実装）
- [ ] Firestore データベース作成
- [ ] Security Rules 設定
- [ ] `firebase` パッケージインストール
- [ ] `src/lib/firebase.ts` 作成
- [ ] `.env.local` 設定
- [ ] `AuthContext` 実装
- [ ] `AuthPanel` 更新
- [ ] Cookie → Firestore 移行実装
- [ ] Firestore CRUD 操作実装
- [ ] ローカルテスト
- [ ] Firebase Hosting デプロイ
- [ ] 本番環境テスト
- [ ] プライバシーポリシー作成
- [ ] 利用規約作成

---

**進捗に応じて、本ドキュメントをアップデートしてください。**

最終更新: 2025年10月10日
