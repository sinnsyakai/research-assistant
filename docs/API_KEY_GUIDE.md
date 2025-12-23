# APIキー取得ガイド

このアプリを使用するには、**2種類のAPIキー**が必要です。

---

## 1️⃣ Gemini API Key（AI機能用）

**用途**: クエリ翻訳、要約生成、関連性フィルタ

### 取得手順

1. [Google AI Studio](https://aistudio.google.com/apikey) にアクセス
2. Googleアカウントでログイン
3. 「**Get API Key**」をクリック
4. 「**Create API key**」をクリック
5. プロジェクトを選択（なければ作成）
6. 表示されたAPIキーをコピー

> **形式**: `AIzaSy...` で始まる文字列

---

## 2️⃣ Custom Search API Key + CSE ID（検索機能用）

**用途**: ニュース検索、海外情報検索

### A. Custom Search API Key の取得

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) にアクセス
2. Googleアカウントでログイン
3. プロジェクトを選択（なければ「**新しいプロジェクト**」で作成）
4. 「**+ 認証情報を作成**」→「**APIキー**」
5. 表示されたAPIキーをコピー

> **形式**: `AIza...` で始まる文字列（Gemini APIキーとは別のキー）

### B. Custom Search API を有効化

1. [Custom Search API のページ](https://console.cloud.google.com/apis/library/customsearch.googleapis.com) にアクセス
2. 「**有効にする**」をクリック

### C. Search Engine ID (CSE ID) の取得

1. [Programmable Search Engine](https://programmablesearchengine.google.com/) にアクセス
2. 「**追加**」をクリック
3. 以下を設定：
   - **検索するサイト**: `*` を入力（または空欄）
   - **言語**: 日本語
   - **検索エンジンの名前**: 任意（例: Research Assistant）
4. 「**作成**」をクリック
5. **「ウェブ全体を検索」をオン**にする（重要！）
6. 「**検索エンジン ID**」をコピー

> **形式**: `1234567890abcdef12345` のような文字列

---

## 📝 アプリでの設定

1. アプリ右上の **⚙️歯車アイコン** をクリック
2. 以下を入力：
   - **Google API Key (Gemini)**: 1️⃣ で取得したキー
   - **Custom Search API Key**: 2️⃣-A で取得したキー
   - **Search Engine ID (CX)**: 2️⃣-C で取得したID
3. 「**保存して閉じる**」

---

## ⚠️ よくある間違い

| 問題 | 原因 |
|-----|-----|
| 検索結果が0件 | Custom Search API Keyの代わりにGemini API Keyを使っている |
| "API keys are not supported" エラー | Google AI StudioのキーをCustom Searchに使っている |
| "403 Forbidden" | Custom Search APIが有効になっていない |

**重要**: Gemini用とCustom Search用で**別々のAPIキー**が必要です！

---

## 💰 料金について

| API | 無料枠 |
|-----|-------|
| Gemini API | 無料（レート制限あり） |
| Custom Search API | 1日100回まで無料 |
