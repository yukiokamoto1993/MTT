# Firebase認証エラーの修正: auth/unauthorized-domain

## エラー内容

```
認証でエラーが発生しました (auth/unauthorized-domain).
FirebaseError: Firebase: Error (auth/unauthorized-domain).
```

このエラーは、Firebase Authenticationの承認済みドメインリストに`management-tt.web.app`が登録されていないために発生します。

## 原因

Firebase Authenticationは、セキュリティのため、事前に承認されたドメインからの認証リクエストのみを受け付けます。新しくデプロイしたドメイン`management-tt.web.app`がまだ承認されていないため、Google認証がブロックされています。

## 解決方法

### ステップ1: Firebase Consoleにアクセス

1. [Firebase Console](https://console.firebase.google.com/)を開く
2. `onlineweb-tools`プロジェクトを選択

### ステップ2: Authentication設定を開く

1. 左サイドバーから **Authentication** をクリック
2. 上部のタブから **Settings** をクリック
3. 下にスクロールして **承認済みドメイン** (Authorized domains) セクションを探す

### ステップ3: ドメインを追加

#### 必要なドメイン
以下のドメインが承認済みリストに含まれているか確認し、なければ追加:

1. ✅ `localhost` (開発用 - 通常はデフォルトで含まれる)
2. ✅ `onlineweb-tools.firebaseapp.com` (プロジェクトのデフォルトドメイン)
3. **🔴 `management-tt.web.app` (追加が必要)**
4. **🔴 `management-tt.firebaseapp.com` (追加が必要)**

#### 追加手順
1. **ドメインを追加** (Add domain) ボタンをクリック
2. `management-tt.web.app` を入力
3. **追加** をクリック
4. 同様に `management-tt.firebaseapp.com` も追加

### ステップ4: 変更を保存

設定は自動的に保存されます。数分待ってから再度テストしてください。

## 確認手順

### 1. ドメインが正しく追加されたか確認

Firebase Console → Authentication → Settings → 承認済みドメイン で以下が表示されるはず:

```
✓ localhost
✓ onlineweb-tools.firebaseapp.com
✓ management-tt.web.app
✓ management-tt.firebaseapp.com
```

### 2. 本番環境でテスト

1. https://management-tt.web.app にアクセス
2. ページ下部の「Googleで続行」ボタンをクリック
3. Googleアカウント選択画面が表示される
4. アカウントを選択
5. **エラーなく**ログインできる

### 3. デベロッパーツールで確認

ブラウザのデベロッパーツール (F12) → Console タブで:
- ❌ `auth/unauthorized-domain` エラーが**表示されない**
- ✅ "Googleアカウントでログインしました。" のメッセージが表示される

## トラブルシューティング

### 問題1: ドメインを追加したのにまだエラーが出る

**原因**: ブラウザキャッシュまたはFirebase設定の反映待ち

**解決策**:
1. ブラウザのキャッシュをクリア (Ctrl+Shift+Delete)
2. 5-10分待ってから再試行
3. シークレットモード/プライベートブラウジングで試す

### 問題2: 「ドメインを追加」ボタンが見つからない

**原因**: 権限不足またはFirebaseプロジェクトの設定画面が違う

**解決策**:
1. プロジェクトのオーナー権限があるか確認
2. 正しいプロジェクト (`onlineweb-tools`) を選択しているか確認
3. Authentication → Settings → Authorized domains の順に移動

### 問題3: localhost では動作するが本番では動作しない

**原因**: 環境変数の設定ミス

**解決策**:
1. `.env.local` の設定を確認:
   ```env
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=onlineweb-tools.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=onlineweb-tools
   ```
2. これらの環境変数がビルド時に正しく読み込まれているか確認
3. Firebase Hostingの環境変数設定を確認

## 参考スクリーンショット位置

### Firebase Console での承認済みドメイン設定画面

```
Firebase Console
└── onlineweb-tools (プロジェクト選択)
    └── Authentication
        └── Settings (タブ)
            └── Authorized domains (セクション)
                └── [ドメインを追加] ボタン
```

### 追加すべきドメイン一覧

| ドメイン | 用途 | 必須度 |
|---------|------|--------|
| `localhost` | ローカル開発 | ⭐⭐⭐ |
| `onlineweb-tools.firebaseapp.com` | Firebase デフォルト | ⭐⭐⭐ |
| `management-tt.web.app` | 本番環境 | ⭐⭐⭐ |
| `management-tt.firebaseapp.com` | Firebase サブドメイン | ⭐⭐ |

## まとめ

このエラーは、Firebase Consoleで以下の手順を実行することで解決できます:

1. Firebase Console → Authentication → Settings
2. 承認済みドメインに `management-tt.web.app` を追加
3. 承認済みドメインに `management-tt.firebaseapp.com` を追加
4. 数分待ってから再テスト

設定変更後、すぐに反映されない場合は5-10分待ってからブラウザのキャッシュをクリアして再試行してください。

---

作成日: 2025年10月19日
