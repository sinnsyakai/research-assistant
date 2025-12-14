# Research Assistant v2.0 仕様書・リカバリガイド

## 🌐 デプロイ情報

| 項目 | URL |
|-----|-----|
| **本番環境** | https://research-assistant.up.railway.app/ |
| GitHub | https://github.com/sinnsyakai/research-assistant |
| ローカル | http://localhost:3000 |

---

## 📋 システム仕様

### 技術スタック
- **フレームワーク**: Next.js 14
- **言語**: TypeScript
- **API**: Google Custom Search, OpenAlex, Gemini AI

### 主要ファイル
| ファイル | 役割 |
|---------|------|
| `app/api/search/route.ts` | 検索API（翻訳・フィルタ・キュレーション） |
| `app/api/summarize/route.ts` | 要約生成API |
| `app/page.tsx` | フロントエンド |
| `app/config/whitelist.ts` | 信頼ソース設定 |

---

## 🔧 実装機能

### 1. AIクエリ意図分析 (行37-68)
- 曖昧なクエリを明確化
- 例: 「マスク」→「フェイスマスク」

### 2. 概念展開翻訳 (行71-100)
- 抽象概念を具体例に展開
- SNS → TikTok Instagram YouTube Twitter

### 3. 論文フレーズ検索 (行660-690)
- 引用符でフレーズ検索
- OR演算子で関連語も含める

### 4. 結果翻訳 (行575-610)
- 海外記事: タイトル+要約を日本語化（最大20件）
- 論文: タイトル+要約を日本語化（最大30件）

### 5. AI関連性フィルタ (行520-570)
- 検索結果をAIが評価
- 無関係な結果を自動除外

### 6. ブロックリスト (行246-280)
- 発言小町、5ch、PR記事
- 個人ブログ、スパムドメイン

### 7. 論文日付フィルタ (行705-730)
- 未来日付の論文を除外
- 2020年以降の論文を優先

### 8. 参考文献対応 (summarize/route.ts 行41-50)
- 著者、掲載誌、URLを含める

---

## 🔴 リカバリ手順

### バックアップファイル
```
/Users/M/.gemini/antigravity/research-assistant/backups/v2_20241214/
├── RECOVERY.md
├── route.ts
└── page.tsx
```

### 復元コマンド
```bash
# コード復元
cp backups/v2_20241214/route.ts app/api/search/route.ts
cp backups/v2_20241214/page.tsx app/page.tsx

# サーバー起動
npm run dev
```

### よくある問題と対策

| 問題 | 原因 | 対策 |
|-----|-----|-----|
| 翻訳されない | Gemini APIキー未設定 | 設定画面でAPIキー入力 |
| 海外の情報が0件 | クエリが複雑すぎ | 翻訳プロンプトを簡素化 |
| 論文日付がおかしい | OpenAlexデータ不備 | 未来日付フィルタ適用済み |
| 低品質記事混入 | ブロックリスト漏れ | blockedPatternsに追加 |

---

## 🔑 必要なAPIキー

1. **Google Search API Key** - Google Cloud Console
2. **Google CSE ID** - Programmable Search Engine
3. **Gemini API Key** - Google AI Studio

---

## 📞 デバッグ

サーバーログで確認：
```
[Query Disambiguation] - クエリ明確化
[Global] Translated query: - 英語翻訳
[Papers] Translated query: - 論文クエリ翻訳
[AI Relevance] - 関連性フィルタ
[Filter] Blocked - ブロックされたURL
```
