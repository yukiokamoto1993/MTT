# Firebase承認済みドメイン設定 - クイックガイド

## 🚨 エラー: auth/unauthorized-domain

本番環境でGoogle認証が失敗する場合は、以下の手順で承認済みドメインを追加してください。

## ⚡ クイック設定（5分で完了）

### Step 1: Firebase Consoleを開く
🔗 https://console.firebase.google.com/

### Step 2: プロジェクトを選択
📁 **onlineweb-tools** プロジェクトをクリック

### Step 3: Authenticationに移動
🔐 左サイドバー → **Authentication** をクリック

### Step 4: Settingsタブを開く
⚙️ 上部タブ → **Settings** をクリック

### Step 5: 承認済みドメインセクション
📋 下にスクロールして **承認済みドメイン** (Authorized domains) を探す

### Step 6: ドメインを追加
➕ **ドメインを追加** (Add domain) ボタンをクリック

#### 追加が必要なドメイン:

```
1. management-tt.web.app
2. management-tt.firebaseapp.com
```

各ドメインを1つずつ追加:
1. テキストボックスにドメインを入力
2. **追加** ボタンをクリック
3. 次のドメインも同様に追加

### Step 7: 完了確認
✅ 以下のドメインが表示されることを確認:

```
✓ localhost
✓ onlineweb-tools.firebaseapp.com
✓ management-tt.web.app          ← 新規追加
✓ management-tt.firebaseapp.com  ← 新規追加
```

## 🧪 動作確認

### 1. ブラウザキャッシュをクリア
```
Ctrl + Shift + Delete (Windows)
Cmd + Shift + Delete (Mac)
```

### 2. 本番環境でテスト
1. https://management-tt.web.app にアクセス
2. ページ下部の「Googleで続行」ボタンをクリック
3. Googleアカウントを選択
4. ✅ エラーなくログインできる

### 3. コンソールエラーチェック
F12 → Console タブ:
- ❌ `auth/unauthorized-domain` エラーが**表示されない**
- ✅ "Googleアカウントでログインしました。" と表示される

## 📱 よくある質問

### Q1: 設定したのにまだエラーが出る
**A:** ブラウザキャッシュをクリアして、5-10分待ってから再試行してください。

### Q2: localhostでは動作するのに本番で動作しない
**A:** `management-tt.web.app` が承認済みドメインに追加されているか再確認してください。

### Q3: 「ドメインを追加」ボタンが見つからない
**A:** プロジェクトのオーナー権限があるか確認し、Authentication → Settings → Authorized domains の順に移動してください。

## 🔗 関連ドキュメント

- 詳細ガイド: [docs/fix-unauthorized-domain.md](./fix-unauthorized-domain.md)
- デプロイチェックリスト: [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)
- Firebase設定: [docs/firebase-setup.md](./firebase-setup.md)

---

**重要**: この設定は必須です。設定しないと本番環境でGoogle認証が機能しません。

最終更新: 2025年10月19日
