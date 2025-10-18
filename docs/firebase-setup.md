# Firebase セットアップガイド - management-tt

このドキュメントでは、MTTプロジェクトを`onlineweb-tools`プロジェクト内の`management-tt`サイトとしてFirebaseにデプロイするための設定手順を説明します。

## プロジェクト情報

- **Firebaseプロジェクト**: `onlineweb-tools`
- **Hostingサイト**: `management-tt`
- **デプロイURL**: `https://management-tt.web.app`
- **認証ドメイン**: `onlineweb-tools.firebaseapp.com`
- **Firestoreデータベース**: `management-tt` (Named Database)

## 前提条件

- Node.js 18.17以降がインストールされていること
- Firebaseアカウント（無料プランでOK）
- Firebase CLIがインストールされていること

## Firebase CLIのインストール

```bash
npm install -g firebase-tools
```

## Firebaseプロジェクトの設定

### 1. Firebase Hostingターゲットの確認

`.firebaserc`ファイルで`management-tt`ターゲットが設定されていることを確認:

```json
{
  "projects": {
    "default": "onlineweb-tools"
  },
  "targets": {
    "onlineweb-tools": {
      "hosting": {
        "management-tt": [
          "management-tt"
        ]
      }
    }
  }
}
```

### 2. firebase.json の設定

```json
{
  "firestore": {
    "database": "management-tt",
    "location": "asia-northeast1",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "target": "management-tt",
    "public": ".next",
    "source": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "frameworksBackend": {
      "region": "asia-east1"
    }
  }
}
```

#### 設定の説明

- **firestore.database**: Named Database `management-tt` を使用
- **firestore.location**: データベースのリージョン（asia-northeast1 = 東京）
- **hosting.target**: Hostingターゲット `management-tt` を指定
- **hosting.public**: Next.jsビルド出力ディレクトリ（`.next`）
- **hosting.source**: Firebase Frameworks対応（自動ビルド）
- **frameworksBackend.region**: Cloud Functionsリージョン（asia-east1）

## firestore.rules

Firestoreセキュリティルール（Named Database: management-tt用）:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/management-tt/documents {
    
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
  match /databases/management-tt/documents {
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

Firebase Frameworks統合を使用するため、静的エクスポート設定は不要です：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Firebase Frameworks統合を使用する場合は output: 'export' は不要
  // デフォルトのSSR/ISRモードでデプロイされます
}

module.exports = nextConfig
```

### 設定の説明

- Firebase Frameworksが自動的にNext.jsアプリをビルド・デプロイ
- SSR（Server-Side Rendering）とISR（Incremental Static Regeneration）がサポートされる
- Cloud Functionsが自動的に生成される

## 環境変数: .env.local

Firebase設定を環境変数として保存（management-tt用）:

```env
# Firebase Configuration for management-tt
# Project: onlineweb-tools
# Hosting Site: management-tt
# URL: https://management-tt.web.app

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=onlineweb-tools.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=onlineweb-tools
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=onlineweb-tools.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here

# Named Database for management-tt
NEXT_PUBLIC_FIREBASE_DATABASE_NAME=management-tt

# Optional: Use Firebase Emulator for local development
# NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```

### 取得方法

1. [Firebase Console](https://console.firebase.google.com/) を開く
2. `onlineweb-tools` プロジェクトを選択
3. プロジェクト設定（歯車アイコン）→ マイアプリ
4. Web アプリを選択
5. SDK の設定と構成 → 構成 から値をコピー

### 重要な設定項目

- **NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN**: `onlineweb-tools.firebaseapp.com`
- **NEXT_PUBLIC_FIREBASE_PROJECT_ID**: `onlineweb-tools`
- **NEXT_PUBLIC_FIREBASE_DATABASE_NAME**: `management-tt`（Named Database）

### Firebase Console での認証ドメイン設定

1. Firebase Console → Authentication → Settings → 承認済みドメイン
2. 以下のドメインを追加:
   - `management-tt.web.app`
   - `management-tt.firebaseapp.com`
   - `localhost` (開発用)

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

### 初回デプロイ（全サービス）

```bash
firebase deploy
```

すべてのFirebaseサービス（Hosting, Firestore Rules, Indexes等）をデプロイします。

### management-tt サイトのみデプロイ

```bash
firebase deploy --only hosting:management-tt
```

### Firestoreルールのみデプロイ（Named Database指定）

```bash
firebase deploy --only firestore:management-tt
```

### その他のデプロイコマンド

```bash
# Firestoreインデックスのみ
firebase deploy --only firestore:management-tt --only-indexes

# 複数のサービスを同時にデプロイ
firebase deploy --only hosting:management-tt,firestore:management-tt
```

## デプロイ前の確認事項

### 1. Firebase Console での設定確認

#### Authentication設定
1. Firebase Console → Authentication → Sign-in method
2. 以下のプロバイダを有効化:
   - Google (有効化済みか確認)
   - メール/パスワード (有効化済みか確認)

3. Settings → 承認済みドメイン
   - `management-tt.web.app` が追加されているか確認
   - `localhost` が開発用に追加されているか確認

#### Firestore設定
1. Firebase Console → Firestore Database
2. Named Database `management-tt` が作成されているか確認
3. ロケーション: `asia-northeast1` (東京)

### 2. ローカルでの動作確認

```bash
# 開発サーバーで動作確認
npm run dev

# ビルドエラーがないか確認
npm run build
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

### 問題: "Target management-tt not detected"

**原因**: Hostingターゲットが設定されていない

**解決策**:
```bash
firebase target:apply hosting management-tt management-tt
```

### 問題: Firestore Permission Denied

**原因**: Named Database指定が正しくない、またはセキュリティルールの問題

**解決策**:
1. 環境変数 `NEXT_PUBLIC_FIREBASE_DATABASE_NAME=management-tt` を確認
2. firestore.rulesで `match /databases/management-tt/documents` を確認
3. Firebase Consoleでルールが正しくデプロイされているか確認

### 問題: 認証後にリダイレクトエラー

**原因**: 承認済みドメインに `management-tt.web.app` が登録されていない

**解決策**:
1. Firebase Console → Authentication → Settings → 承認済みドメイン
2. `management-tt.web.app` を追加
3. `management-tt.firebaseapp.com` も追加（推奨）

### 問題: デプロイ時に "Firebase Frameworks" エラー

**原因**: Node.jsバージョンまたは依存関係の問題

**解決策**:
```bash
# Node.jsバージョンを確認（18.17以上必要）
node --version

# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install
```

### 問題: 複数のHostingサイトがある場合のデプロイ

**解決策**:
```bash
# 特定のサイトのみデプロイ
firebase deploy --only hosting:management-tt

# すべてのサイトをデプロイ
firebase deploy --only hosting
```

## デプロイ後の確認

### 1. Hostingの確認

ブラウザで以下のURLにアクセス:
- **メインURL**: https://management-tt.web.app
- **代替URL**: https://management-tt.firebaseapp.com

### 2. 動作確認

1. ページが正しく表示されるか
2. 認証機能が動作するか（Googleログイン/メール登録）
3. タスクの作成・編集・削除が動作するか
4. Firestoreへの保存が正しく行われるか
5. ログアウト後にCookieに保存されるか

### 3. Firebase Consoleでの確認

#### Hosting
1. Firebase Console → Hosting
2. `management-tt` サイトの状態を確認
3. デプロイ履歴とトラフィックを確認

#### Firestore
1. Firebase Console → Firestore Database
2. Database: `management-tt` を選択
3. `users/{userId}/tasks` コレクションにデータが保存されているか確認

#### Authentication
1. Firebase Console → Authentication → Users
2. 登録されたユーザーが表示されるか確認

## 本番環境のセキュリティ対策

### 1. Firestoreセキュリティルールの確認

```bash
firebase deploy --only firestore:management-tt
```

本番環境では**必ず**認証チェックを含むルールを使用:

```javascript
match /users/{userId}/tasks/{taskId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### 2. Firebase App Checkの導入（推奨）

1. Firebase Console → App Check
2. Web アプリを登録
3. reCAPTCHA v3 または reCAPTCHA Enterprise を設定

### 3. 環境変数の管理

- `.env.local` は絶対にGitにコミットしない
- Firebase APIキーは公開されても問題ないが、App Checkで保護推奨
- 秘密情報（サービスアカウントキー等）は絶対に含めない

---

最終更新: 2025年10月19日
