# Architecture Documentation

## システムアーキテクチャ

### 概要
MTT (Management Task and Todo)は、クライアントサイドでのデータ管理を中心とした、段階的にクラウド連携を実現するアーキテクチャです。

## フェーズ1: Cookie-based Storage（現在）

### アーキテクチャ図
```
┌─────────────────────────────────────────┐
│         Browser (Client)                │
│  ┌───────────────────────────────────┐  │
│  │      Next.js App (SSR/CSR)        │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │   React Components          │  │  │
│  │  │  - TaskForm                 │  │  │
│  │  │  - TaskList                 │  │  │
│  │  │  - TaskItem                 │  │  │
│  │  └─────────────────────────────┘  │  │
│  │              ↕                     │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │   Cookie Storage            │  │  │
│  │  │  (js-cookie library)        │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### データフロー
1. ユーザーがタスクを作成/更新/削除
2. Reactのstate management（useState）で管理
3. useEffectでstateの変更を監視
4. js-cookieを使用してCookieに自動保存
5. ページロード時にCookieからデータを復元

### 技術的な実装詳細

#### Cookie Storage
- **ライブラリ**: js-cookie
- **有効期限**: 365日
- **データ形式**: JSON文字列
- **容量制限**: 約4KB（Cookie制限による）

#### State Management
```typescript
const [tasks, setTasks] = useState<Task[]>([]);

// Load from Cookie on mount
useEffect(() => {
  const savedTasks = Cookies.get("tasks");
  if (savedTasks) {
    setTasks(JSON.parse(savedTasks));
  }
}, []);

// Save to Cookie on change
useEffect(() => {
  Cookies.set("tasks", JSON.stringify(tasks), { expires: 365 });
}, [tasks]);
```

## フェーズ2: Firebase Integration（予定）

### アーキテクチャ図
```
┌─────────────────────────────────────────┐
│         Browser (Client)                │
│  ┌───────────────────────────────────┐  │
│  │      Next.js App                  │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │   Components + Auth UI      │  │  │
│  │  └─────────────────────────────┘  │  │
│  │              ↕                     │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │   Firebase SDK (Client)     │  │  │
│  │  │   - Authentication          │  │  │
│  │  │   - Firestore (Client SDK)  │  │  │
│  │  └─────────────────────────────┘  │  │
│  │              ↕                     │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │   Cookie Storage (Fallback) │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  ↕
┌─────────────────────────────────────────┐
│         Firebase Services               │
│  ┌───────────────────────────────────┐  │
│  │   Firebase Authentication         │  │
│  │   - Google OAuth                  │  │
│  │   - Email/Password                │  │
│  │   - Apple, X (Twitter), LINE      │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Cloud Firestore                 │  │
│  │   - users collection              │  │
│  │   - tasks collection              │  │
│  │   - Real-time sync                │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Firebase Hosting                │  │
│  │   - Static site hosting           │  │
│  │   - CDN distribution              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Cookie→Firestore移行フロー

```
1. ユーザーが認証プロバイダを選択してログイン
   ↓
2. Firebase Authentication で認証
   (Google / Email / Apple / X / LINE)
   ↓
3. 認証成功後、Cookieからタスクデータを取得
   ↓
4. Firestore にタスクデータを移行
   - Collection: users/{userId}/tasks
   - Batch write でデータを一括保存
   ↓
5. 移行完了後、Cookieデータをバックアップまたはクリア
   ↓
6. 以降はFirestoreを使用してCRUD操作
   - リアルタイムリスナーで自動同期
   - オフライン対応（Firestore cache）
```

### Firebase Authentication フロー

```typescript
// 認証プロバイダの初期化
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  OAuthProvider
} from 'firebase/auth';

// Google ログイン
const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);

// Email/Password ログイン
await signInWithEmailAndPassword(auth, email, password);

// Apple ログイン
const appleProvider = new OAuthProvider('apple.com');
await signInWithPopup(auth, appleProvider);
```

## データモデル

### Task型定義
```typescript
interface Task {
  id: string;              // ユニークID（タイムスタンプベース）
  title: string;           // タスク名（必須）
  description?: string;    // 説明（任意）
  completed: boolean;      // 完了状態
  createdAt: string;       // 作成日時（ISO 8601）
  updatedAt?: string;      // 更新日時（ISO 8601）
}
```

### Database Schema（予定）

Firestoreデータモデル:

```typescript
// Collection: users
interface UserDocument {
  uid: string;              // Firebase Auth UID
  email: string;
  displayName?: string;
  photoURL?: string;
  provider: string;         // google, password, apple, twitter, line
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection: users/{userId}/tasks (Subcollection)
interface TaskDocument {
  id: string;               // Document ID
  title: string;
  description?: string;
  completed: boolean;
  level: "kgi" | "kpi" | "kai";
  parentId?: string;        // 親タスクのID
  order: number;            // 並び順
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のタスクのみアクセス可能
    match /users/{userId}/tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## セキュリティ考慮事項

### Cookie Storage
- HTTPOnly: false（JavaScriptからアクセス必要）
- Secure: production環境ではtrue
- SameSite: Strict
- データサイズ制限: 4KB以下

### Future: Firebase Storage
- Firebase Authentication (認証済み)
- Firestore Security Rules
- HTTPS only (Firebase Hosting)
- Rate limiting (Firebase App Check)
- データの暗号化（Firestore標準）

## パフォーマンス最適化

### 現在
- Client-side rendering for interactive UI
- Server-side rendering for initial page load
- Optimistic UI updates

### Future
- SWR for data fetching
- Incremental Static Regeneration (ISR)
- Edge caching

## スケーラビリティ

### Phase 1 (Cookie)
- 制限: Cookieサイズ（~4KB）
- 推奨タスク数: 〜50個

### Phase 2 (Firestore)
- 制限: Firestore quotas (無料枠: 50K reads/day, 20K writes/day)
- スケーラブルなNoSQLデータベース
- リアルタイム同期対応

## デプロイメント戦略

### Current (Phase 1)
- Firebase Hosting推奨
- Static export対応
- CDN配信（Firebase CDN）
- カスタムドメイン対応

### Future (Phase 2)
- Firebase Hosting + Firestore
- Firebase Authentication統合
- Firebase App Check（セキュリティ）
- Firebase Performance Monitoring

## モニタリングとログ

### 現在
- Browser console logging
- Error boundaries

### 予定
- Application monitoring (Firebase Crashlytics)
- Analytics (Firebase Analytics / Google Analytics 4)
- Performance monitoring (Firebase Performance Monitoring)

## テスト戦略（予定）

### Unit Tests
- Component testing (Jest + React Testing Library)
- Utility function testing

### Integration Tests
- API route testing
- Database operation testing

### E2E Tests
- User flow testing (Playwright)
- Cross-browser testing

## CI/CD パイプライン（予定）

```yaml
1. Code Push to GitHub
   ↓
2. GitHub Actions triggered
   ↓
3. Lint & Type Check
   ↓
4. Run Tests
   ↓
5. Build Application (npm run build)
   ↓
6. Deploy to Firebase Hosting (Preview Channel)
   ↓
7. Manual approval for Production
   ↓
8. Deploy to Production (firebase deploy)
```

### GitHub Actions + Firebase Hosting

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

## 環境変数管理

### Current
なし（Cookie-based storage）

### Future (Firebase統合時)
```env
# Firebase Configuration (公開可能)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin SDK (サーバーサイドのみ、秘密情報)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Optional
NEXT_PUBLIC_GA_TRACKING_ID=
```

Firebase設定は `src/lib/firebase.ts` で初期化します。

## バージョニング

セマンティックバージョニングを採用:
- MAJOR: 破壊的変更
- MINOR: 新機能追加
- PATCH: バグ修正

現在: 0.1.0 (Initial Release with Cookie Storage)
