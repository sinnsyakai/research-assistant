# Research Assistant v1.0 - 2024/12/13

## 機能概要

### 検索モード
1. **全般 (Default)** - Web全体を検索、日本語優先
2. **ニュースのみ (News)** - ニュースサイトを優先、1ヶ月以内自動フィルタ
3. **論文のみ (Papers)** - OpenAlex学術検索
4. **海外の情報 (Global)** - US版Google、英語検索、日本語クエリ自動翻訳

### コア機能
- **Smart Date**: ニュースキーワード検出で自動1ヶ月フィルタ
- **日本語検索パラメータ**: gl=jp, hl=ja, lr=lang_ja
- **信頼できるソース優先**: ホワイトリストサイトを先に検索
- **ホワイトリストフィルタ**: 記事パターン(日付URL/記事ID/スラグ)のみ許可
- **重複除去**: URL正規化 + タイトル類似性チェック
- **包括的日付抽出**: 15種類以上のメタタグ + URL + スニペット + 相対日付

### 信頼できるソース (ホワイトリスト)
**国内**:
- NHK, 朝日新聞, 読売新聞, 毎日新聞, 産経新聞
- 時事通信, Business Insider Japan, ITmedia, GIGAZINE

**海外**:
- Reuters, BBC, NYT, Guardian, Washington Post, CNN
- TechCrunch, Wired, The Verge, Ars Technica

### ブロックリスト
- Q&Aサイト: Yahoo!知恵袋, 教えてgoo, OKWave, Quora, Stack Overflow
- 個人ブログ: アメブロ, note, はてな, livedoor, FC2, Blogspot
- 辞書: Wikipedia, Weblio, コトバンク
- 一覧ページ: /topics/, /tag/, /keyword/, /list/, /archive/
- ショッピング (商品検索以外): Amazon, 楽天, 価格.com, メルカリ

### 商品検索インテント
以下のキーワードでショッピングサイトを許可:
- 商品, 製品, レビュー, 比較, スペック, 性能, 価格, 購入, おすすめ
- product, review, comparison, specs, price, buy, best, vs

### API使用
- Google Custom Search API (検索)
- Gemini API (クエリ翻訳)
- OpenAlex API (論文検索)

## ファイル構成
- `route.ts` - APIルート(検索ロジック)
- `page.tsx` - フロントエンドUI
