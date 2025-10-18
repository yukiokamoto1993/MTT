# デプロイ前チェックリスト - management-tt

このチェックリストは、`management-tt.web.app`へのデプロイ前に確認すべき項目です。

## ✅ Firebase Console での設定確認

### 1. プロジェクト情報
- [ ] プロジェクトID: `onlineweb-tools`
- [ ] Hostingサイト: `management-tt`
- [ ] デプロイURL: `https://management-tt.web.app`

### 2. Authentication設定

#### Sign-in Method
- [ ] Google: 有効化済み
- [ ] メール/パスワード: 有効化済み

Firebase Console → Authentication → Sign-in method で確認

#### 承認済みドメイン
以下のドメインが登録されているか確認:
- [ ] `localhost` (開発用)
- [ ] `management-tt.web.app` ⚠️ **重要: これがないと本番環境でGoogle認証が失敗する**
- [ ] `management-tt.firebaseapp.com`
- [ ] `onlineweb-tools.firebaseapp.com`

Firebase Console → Authentication → Settings → 承認済みドメイン で確認・追加

**ドメイン追加方法:**
1. 「ドメインを追加」ボタンをクリック
2. `management-tt.web.app` を入力して追加
3. 同様に `management-tt.firebaseapp.com` も追加
4. 詳細は `docs/fix-unauthorized-domain.md` を参照

### 3. Firestore Database

#### Named Database
- [ ] データベース名: `management-tt`
- [ ] ロケーション: `asia-northeast1` (東京)
- [ ] モード: 本番モード

Firebase Console → Firestore Database で確認

#### セキュリティルール
以下のルールがデプロイされているか確認:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/management-tt/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Firebase Console → Firestore Database → ルール で確認

### 4. Hosting設定

#### サイト情報
- [ ] サイト名: `management-tt`
- [ ] ドメイン: `management-tt.web.app`
- [ ] ステータス: 有効

Firebase Console → Hosting で確認

## ✅ ローカル環境設定

### 1. 環境変数ファイル (.env.local)

以下の環境変数が設定されているか確認:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=<your_api_key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=onlineweb-tools.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=onlineweb-tools
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=onlineweb-tools.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your_sender_id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your_app_id>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<your_measurement_id>
NEXT_PUBLIC_FIREBASE_DATABASE_NAME=management-tt
```

- [ ] `.env.local` ファイルが存在する
- [ ] すべての値が設定されている
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` が `onlineweb-tools.firebaseapp.com`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` が `onlineweb-tools`
- [ ] `NEXT_PUBLIC_FIREBASE_DATABASE_NAME` が `management-tt`

### 2. Firebase設定ファイル

#### firebase.json
- [ ] `hosting.target` が `management-tt`
- [ ] `firestore.database` が `management-tt`

#### .firebaserc
- [ ] `projects.default` が `onlineweb-tools`
- [ ] `targets.onlineweb-tools.hosting.management-tt` が設定されている

#### firestore.rules
- [ ] `match /databases/management-tt/documents` となっている
- [ ] Named Database `management-tt` を指定している

## ✅ デプロイ前テスト

### 1. ローカル開発サーバー
```bash
npm run dev
```
- [ ] サーバーが起動する
- [ ] http://localhost:3000 でアプリが表示される
- [ ] 認証機能が動作する
- [ ] タスクのCRUDが動作する

### 2. ビルドテスト
```bash
npm run build
```
- [ ] エラーなくビルドが完了する
- [ ] TypeScriptエラーがない

## ✅ デプロイコマンド

### 初回デプロイ（全サービス）
```bash
firebase deploy
```

### management-ttサイトのみ
```bash
firebase deploy --only hosting:management-tt
```

### Firestoreルールのみ
```bash
firebase deploy --only firestore:management-tt
```

## ✅ デプロイ後確認

### 1. URLアクセス確認
- [ ] https://management-tt.web.app にアクセス
- [ ] ページが正しく表示される
- [ ] 404エラーがない

### 2. 機能確認
- [ ] ゲストモード（Cookie保存）が動作する
- [ ] Googleログインが動作する
- [ ] メール認証が動作する
- [ ] タスクの作成・編集・削除が動作する
- [ ] Firestoreへのデータ保存が確認できる
- [ ] ログアウト後にCookieに保存される

### 3. Firebase Console確認

#### Hosting
- [ ] Firebase Console → Hosting → management-tt
- [ ] 最新のデプロイが表示される
- [ ] デプロイ時刻が正しい

#### Firestore
- [ ] Firebase Console → Firestore Database → management-tt
- [ ] テストユーザーのデータが保存されている
- [ ] `users/{userId}/tasks` コレクションが確認できる

#### Authentication
- [ ] Firebase Console → Authentication → Users
- [ ] テストユーザーが登録されている

## ⚠️ トラブルシューティング

### エラー: "Target management-tt not detected"
```bash
firebase target:apply hosting management-tt management-tt
```

### エラー: "Permission Denied" (Firestore)
1. firestore.rulesで `match /databases/management-tt/documents` を確認
2. 環境変数 `NEXT_PUBLIC_FIREBASE_DATABASE_NAME=management-tt` を確認
3. Firebase Consoleでルールがデプロイされているか確認

### エラー: 認証リダイレクトエラー
1. Firebase Console → Authentication → Settings → 承認済みドメイン
2. `management-tt.web.app` が追加されているか確認

## 📝 参考ドキュメント

- [Firebase Setup Guide](docs/firebase-setup.md) - 詳細なセットアップ手順
- [Firebase Console](https://console.firebase.google.com/) - Firebase管理画面
- [Deployment URL](https://management-tt.web.app) - 本番環境URL

---

最終更新: 2025年10月19日
