# News LINE Bot

自分専用のニュースAIエージェントです。指定したキーワードでニュースを検索し、AI（Gemini）が厳選・要約してLINEに配信します。

## ⚙️ 設定 (config.json)

`config.json` を編集することで、配信内容を自由に変更できます。

```json
{
  "genres": [
    {
      "id": "education",
      "name": "教育ニュース",
      "keywords": ["学校教育", "不登校", "AI教育"],
      "maxItems": 3  <-- 1回に送る記事数
    }
  ],
  "globalSettings": {
    "searchPeriod": "d1",  <-- d1(1日), d3(3日), w1(1週間)
    "sendToLine": true
  }
}
```

## 🚀 実行方法

### ローカルで実行
```bash
npm start
```

### 特定のジャンルだけ実行
```bash
npm start education
```

---

## ☁️ Railwayでの自動定期実行 (Cron)

このボットを24時間自動で動かす手順です。

### 1. GitHubへプッシュ
現在、`research-assistant` リポジトリの中にいます。これ全体をプッシュします。

### 2. Railwayでプロジェクト作成
1. [Railway Dashboard](https://railway.app/dashboard) で「New Project」→「Deploy from GitHub repo」
2. `research-assistant` リポジトリを選択
3. **重要**: 変数 (`.env`) を設定します。
   - `GOOGLE_GEMINI_KEY`
   - `GOOGLE_CUSTOM_SEARCH_KEY`
   - `GOOGLE_CSE_ID`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`

### 3. 設定変更 (Root Directory)
このボットはサブフォルダ `news-line-bot` にあるため、Railwayにそれを伝えます。

1. **Settings** タブを開く
2. **Root Directory** を `/news-line-bot` に変更
3. これで自動的にビルドが始まります。

### 4. スケジュール設定 (Cron)
1. **Settings** タブの **Cron Schedule** を探す
2. **Schedule** に以下を入力（例: 日本時間 朝7時に実行）
   ```
   0 22 * * *
   ```
   ※ Railwayは世界標準時(UTC)なので、**日本時間マイナス9時間** で設定します。
   - 日本 朝7:00 → UTC 22:00 (前日)
   - 日本 朝8:00 → UTC 23:00 (前日)
   - 日本 昼12:00 → UTC 03:00

3. **Start Command** が `npm start` になっていることを確認（デフォルトでなるはずですが、明示的に設定してもOK）。

これで毎日指定した時間にLINEが届きます！
