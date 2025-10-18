# Firebase セットアップガイド

このドキュメントでは、MTTプロジェクトをFirebaseにデプロイするための設定手順を説明します。

## 前提条件

- Node.js 18.17以降がインストールされていること
- Firebaseアカウント（無料プランでOK）
- Firebase CLIがインストールされていること

## Firebase CLIのインストール

```bash
npm install -g firebase-tools
```

## Firebaseプロジェクトの初期化

### 1. Firebaseにログイン

```bash
firebase login
```

ブラウザが開き、Googleアカウントでログインします。

### 2. プロジェクトの初期化

プロジェクトルートで以下を実行:

```bash
firebase init
```

対話形式で以下を選択:

#### 2.1 機能の選択
- **Hosting**: Configure files for Firebase Hosting
- **Firestore**: Deploy Cloud Firestore security rules
- **Authentication**: Configure Authentication settings （後で設定）

スペースキーで選択、Enterで次へ。

#### 2.2 プロジェクトの選択
- `Use an existing project` を選択
- 既存のFirebaseプロジェクトを選択、または `Create a new project` で新規作成

#### 2.3 Firestore設定
- `firestore.rules` のパス: デフォルトのまま Enter
- `firestore.indexes.json` のパス: デフォルトのまま Enter

#### 2.4 Hosting設定
- Public directory: `out` と入力（Next.jsの静的エクスポート先）
- Configure as a single-page app: `Yes`
- Set up automatic builds with GitHub: お好みで選択（推奨: Yes）
- Overwrite files: `No`

### 3. 生成されるファイル

初期化完了後、以下のファイルが生成されます:

## firebase.json

プロジェクトルートに作成される設定ファイル:

```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### 設定の説明

- **hosting.public**: デプロイするディレクトリ（Next.jsの静的出力先 `out`）
- **hosting.rewrites**: SPAルーティング対応
- **firestore.rules**: Firestoreセキュリティルールファイル
- **firestore.indexes**: Firestoreインデックス定義

## .firebaserc

プロジェクトのエイリアス設定:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

`your-project-id` は実際のFirebaseプロジェクトIDに置き換えられます。

## firestore.rules

Firestoreセキュリティルール（本番環境用）:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ユーザーは自分のタスクのみアクセス可能
    match /users/{userId}/tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // ユーザープロフィール（自分のみ）
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // デフォルトは全て拒否
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### ルールの説明

- **認証必須**: すべての操作で `request.auth != null` を確認
- **所有者のみアクセス**: `request.auth.uid == userId` でユーザー自身のデータのみ許可
- **デフォルト拒否**: 明示的に許可されていない操作は全て拒否

### テスト用ルール（開発時のみ）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // 全て許可（本番では絶対に使用しない）
    }
  }
}
```

**警告**: 本番環境では絶対に使用しないこと！

## firestore.indexes.json

Firestoreのインデックス定義:

```json
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "completed",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### インデックスの説明

- タスク一覧を作成日時の降順 + 完了状態でソート
- 複合クエリに必要なインデックスを事前定義

## Next.js設定: next.config.js

静的エクスポート用の設定を追加:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // trailingSlash: true, // 必要に応じて有効化
}

module.exports = nextConfig
```

### 設定の説明

- **output: 'export'**: 静的HTMLとしてエクスポート
- **images.unoptimized**: Next.js Image Optimizationを無効化（静的エクスポート時必須）
- **trailingSlash**: URLの末尾にスラッシュを追加（Firebase Hostingで推奨される場合あり）

## 環境変数: .env.local

Firebase設定を環境変数として保存:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 取得方法

1. [Firebase Console](https://console.firebase.google.com/) を開く
2. プロジェクトを選択
3. プロジェクト設定（歯車アイコン）→ マイアプリ
4. Web アプリを選択
5. SDK の設定と構成 → 構成 から値をコピー

### 注意事項

- `.env.local` は `.gitignore` に追加して**絶対にコミットしない**
- 本番環境では環境変数を安全に管理
- `NEXT_PUBLIC_` プレフィックスは公開されるため、秘密情報は含めない

## .gitignore の確認

Firebase関連ファイルが適切に無視されているか確認:

```gitignore
# Firebase
.firebase/
.firebaserc
firebase-debug.log
firestore-debug.log

# Environment variables
.env.local
.env.development.local
.env.test.local
.env.production.local

# Next.js
/.next/
/out/
```

## デプロイコマンド

### ビルド

```bash
npm run build
```

`out/` ディレクトリに静的ファイルが生成されます。

### デプロイ

```bash
firebase deploy
```

すべてのFirebaseサービス（Hosting, Firestore Rules等）をデプロイします。

### Hostingのみデプロイ

```bash
firebase deploy --only hosting
```

### Firestoreルールのみデプロイ

```bash
firebase deploy --only firestore:rules
```

## GitHub Actions での自動デプロイ

`.github/workflows/firebase-hosting.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
          NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }}
      
      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

### GitHub Secretsの設定

1. GitHubリポジトリ → Settings → Secrets and variables → Actions
2. 以下のシークレットを追加:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
   - `FIREBASE_SERVICE_ACCOUNT` (Firebase CLIで生成)

### サービスアカウントの生成

```bash
firebase login:ci
```

生成されたトークンを `FIREBASE_SERVICE_ACCOUNT` に保存。

## トラブルシューティング

### 問題: デプロイ時に "public directory not found"

**原因**: `out/` ディレクトリが存在しない

**解決策**:
```bash
npm run build
```
を実行してから再度デプロイ

### 問題: Firestore Permission Denied

**原因**: セキュリティルールが厳しすぎる、または認証していない

**解決策**:
1. Firebase Console でルールを確認
2. 開発時はテスト用ルールを使用
3. ユーザーが認証されているか確認

### 問題: Firebase CLI コマンドが見つからない

**原因**: Firebase CLIがインストールされていない、またはPATHが通っていない

**解決策**:
```bash
npm install -g firebase-tools
```

## リソース

- [Firebase Hosting ドキュメント](https://firebase.google.com/docs/hosting)
- [Firestore セキュリティルール](https://firebase.google.com/docs/firestore/security/get-started)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Firebase CLI リファレンス](https://firebase.google.com/docs/cli)

---

最終更新: 2025年10月10日
