# MTT (Management Task and Todo)

シンプルで効率的なタスク管理アプリケーション with Firebase

## 概要

MTT (Management Task and Todo)は、KGI / KPI / KAI の3層構造で長期・中期・短期の目標を整理できるビジネス向けタスク管理アプリです。ブラウザのCookieを使用してローカルにデータを保存し、Firebase Authenticationでログインするとクラウド同期が有効になります。

**デプロイURL**: https://management-tt.web.app

## 特徴

- 🎯 **KGI / KPI / KAI の3層管理** - 長期・中期・短期の目標を親子関係で整理
- 🧭 **サマリーダッシュボード** - 目標サマリーから直接KGI/KPI/KAIを追加
- � **Firebase Authentication** - Google / メール認証でセキュアにログイン
- ☁️ **Firestore同期** - ログイン時にデータを自動でクラウド同期
- 🍪 **Cookie保存** - ログアウト時はブラウザにデータを安全に保存
- ✨ **シンプルなUI** - 直感的で使いやすいインターフェース
- 🌙 **ダークモード対応** - システムの設定に自動対応
- 📝 **インライン編集** - カード内で迅速に内容を更新
- ☑️ **一括完了制御** - 親目標の完了状態を子階層へ自動反映
- ↩️ **Undo/Redo機能** - 操作を元に戻したり、やり直したりできる
- 👤 **認証情報表示** - ページ上部に常時ログイン状態を表示

## 技術スタック

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Authentication**: Firebase Authentication (Google, Email/Password)
- **Database**: Cloud Firestore
- **Local Storage**: js-cookie (Cookie-based)
- **Hosting**: Firebase Hosting

## プロジェクト構造

```
MTT/
├── .github/
│   └── copilot-instructions.md
├── docs/
│   ├── auth-roadmap.md        # Firebase認証の実装ガイド
│   └── firebase-setup.md      # Firebase設定とデプロイ手順
├── src/
│   ├── app/
│   │   ├── layout.tsx         # RootLayoutとAuthProvider
│   │   ├── page.tsx           # メインページとタスク管理ロジック
│   │   └── globals.css
│   ├── components/
│   │   ├── TaskForm.tsx       # タスク作成ダイアログ
│   │   ├── TaskList.tsx       # タスクリストとサマリー
│   │   ├── TaskItem.tsx       # 個別タスクカード
│   │   ├── AuthPanel.tsx      # 認証パネル（ログイン/登録）
│   │   ├── UserInfo.tsx       # ユーザー認証情報表示
│   │   └── ConfirmationModal.tsx  # 確認モーダル（未使用）
│   ├── context/
│   │   └── AuthContext.tsx    # Firebase認証のContext
│   ├── hooks/
│   │   └── useTaskSync.ts     # Cookie/Firestore同期フック
│   ├── lib/
│   │   ├── firebase.ts        # Firebase初期化
│   │   └── firestoreTasks.ts  # Firestore操作関数
│   └── types/
│       └── task.ts            # タスク型定義
├── public/
├── .env.local                 # Firebase設定（gitignore対象）
├── .eslintrc.json
├── .gitignore
├── firebase.json              # Firebase Hosting設定
├── firestore.indexes.json     # Firestoreインデックス
├── firestore.rules            # Firestoreセキュリティルール
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── ARCHITECTURE.md            # システムアーキテクチャ
└── README.md
```

## セットアップ

### 前提条件

- Node.js 18.17 以降
- npm、yarn、pnpm、または bun

### インストール

1. リポジトリをクローン:
```bash
git clone https://github.com/yukiokamoto1993/MTT.git
cd MTT
```

2. 依存関係をインストール:
```bash
npm install
```

3. Firebase設定ファイルを作成 (`.env.local`):
```bash
# Firebase Project: onlineweb-tools
# Hosting Site: management-tt
# URL: https://management-tt.web.app

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=onlineweb-tools.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=onlineweb-tools
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=onlineweb-tools.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
NEXT_PUBLIC_FIREBASE_DATABASE_NAME=management-tt
```

詳細は `docs/firebase-setup.md` を参照してください。

4. 開発サーバーを起動:
```bash
npm run dev
```

5. ブラウザで開く:
```
http://localhost:3000
```

## 使い方

### 目標の追加
1. 目標サマリーカード全体をクリックすると対象レベルの作成ダイアログが開きます
2. 表示されたモーダルにタイトルと（任意で）説明を入力
3. KPI は紐づける KGI を、KAI は KGI と KPI を順番に選択
4. 「作成する」をクリックすると階層に追加されます

### 目標の管理
- **完了/未完了**: チェックボックスで切り替え（親を完了すると子も連動）
- **編集**: 鉛筆アイコンからタイトル・説明を更新
- **削除**: ゴミ箱アイコンで階層ごとに削除
- **子目標の追加**: KGI / KPI カード右上の「＋」ボタンから下位レベルを作成
- **Undo/Redo**: 操作を元に戻したり、やり直したりできます

### 認証機能
- **ゲストモード**: ログインなしでも利用可能（Cookieに保存）
- **Googleログイン**: Googleアカウントで認証してクラウド同期
- **メール認証**: メールアドレスとパスワードでアカウント作成・ログイン
- **認証情報表示**: ページ上部に常時ログイン状態を表示

### データの保存
- **ゲストモード**: ブラウザのCookieに保存（有効期限365日）
- **ログイン時**: Firestoreに自動同期（マルチデバイス対応）
- **ログアウト時**: Firestoreからデータを取得してCookieに保存
- ログイン/ログアウトでシームレスにデータが引き継がれます

### セキュリティ
- Firebase Authenticationによる安全な認証
- Firestoreセキュリティルールでデータ保護
- ユーザーは自分のデータのみアクセス可能

## ビルドとデプロイ

### プロダクションビルド
```bash
npm run build
```

### ビルドの起動
```bash
npm start
```

### Firebase Hostingへのデプロイ

このプロジェクトは`onlineweb-tools`プロジェクト内の`management-tt`サイトとしてデプロイされます。

#### デプロイ手順

1. Firebase CLIをインストール:
```bash
npm install -g firebase-tools
```

2. Firebaseにログイン:
```bash
firebase login
```

3. management-ttサイトにデプロイ:
```bash
firebase deploy --only hosting:management-tt
```

4. デプロイURL:
```
https://management-tt.web.app
```

#### その他のデプロイコマンド

```bash
# 全サービスをデプロイ
firebase deploy

# Firestoreルールのみデプロイ
firebase deploy --only firestore:management-tt

# Hostingとfirestoreを同時にデプロイ
firebase deploy --only hosting:management-tt,firestore:management-tt
```

詳細は `docs/firebase-setup.md` を参照してください。

## 実装済み機能

- ✅ KGI/KPI/KAI 3層タスク管理
- ✅ Firebase Authentication (Google, Email)
- ✅ Firestore クラウド同期
- ✅ Cookie ローカルストレージ
- ✅ Undo/Redo機能
- ✅ 認証情報表示
- ✅ ダークモード対応
- ✅ インライン編集

## トラブルシューティング

### Google認証エラー: "auth/unauthorized-domain"

**症状**: 本番環境 (https://management-tt.web.app) でGoogleログインを試みると、「認証でエラーが発生しました (auth/unauthorized-domain)」というエラーが表示される。

**原因**: Firebase Authenticationの承認済みドメインに `management-tt.web.app` が登録されていない。

**解決方法**:
1. [Firebase Console](https://console.firebase.google.com/) → `onlineweb-tools` プロジェクトを開く
2. Authentication → Settings → 承認済みドメイン
3. 「ドメインを追加」で以下を追加:
   - `management-tt.web.app`
   - `management-tt.firebaseapp.com`

詳細な手順は [docs/fix-unauthorized-domain.md](docs/fix-unauthorized-domain.md) を参照してください。

## 今後の機能

- [ ] X (Twitter) / Apple / LINE 認証
- [ ] タスクのカテゴリ分け
- [ ] タスクの優先度設定
- [ ] 期限設定とリマインダー
- [ ] タスクの検索・フィルター機能
- [ ] タスクのエクスポート/インポート
- [ ] タスクの共有機能
- [ ] チーム/コラボレーション機能

## アーキテクチャ

### データフロー

```
User Input → Component State → useTaskSync Hook
                                      ↓
                          ┌───────────┴────────────┐
                          ↓                        ↓
                   Cookie Storage          Firestore (ログイン時)
                   (ゲストモード)           (クラウド同期)
```

### データスキーマ

#### Task型
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  level: "kgi" | "kpi" | "kai";
  parentId?: string;
  createdAt: string;
  updatedAt?: string;
  order: number;
  children: Task[]; // KPI / KAI がネストされる
}

type TaskLevel = "kgi" | "kpi" | "kai";
```

#### Firestore構造
```
users/{userId}/
  └── tasks/{taskId}
      ├── title: string
      ├── description?: string
      ├── completed: boolean
      ├── level: "kgi" | "kpi" | "kai"
      ├── parentId?: string
      ├── order: number
      ├── createdAt: timestamp
      └── updatedAt?: timestamp
```

#### Cookie構造
```typescript
// Cookieには階層構造（KGI配列）として保存
type CookieData = Task[]; // KGIの配列（子要素を含む）
```

## 開発

### コーディング規約
- TypeScript strict mode
- ESLint + Next.js推奨設定
- Tailwind CSSユーティリティクラス

### コミット規約
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント更新
- style: コードスタイル修正
- refactor: リファクタリング
- test: テスト追加
- chore: その他の変更

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 作者

yukiokamoto1993

## サポート

問題が発生した場合は、[Issues](https://github.com/yukiokamoto1993/MTT/issues)で報告してください。
