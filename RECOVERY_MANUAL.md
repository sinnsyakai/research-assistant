# Research Assistant - Stable State Recovery Manual
**Date:** 2025-12-11
**Status:** STABLE (Do not modify core logic without explicit instruction)

## 📌 Overview
This document preserves the configuration and logic of the "Research Assistant" application at its most stable point. If the AI agent is reset or the environment crashes, use this guide to restore functionality.

## 🛠 Core Functionality
The application currently operates with a **Hybrid Search Engine**:
1.  **Academic Papers**: Fetched via **OpenAlex API**.
2.  **News & Media**: Fetched via **Google Custom Search API (Strict Mode)**.

### ✅ Key Features (Locked)
-   **Strict Whitelist Enforcement**: News/Media searches automatically append `(site:domain1 OR site:domain2...)` to the query. This prevents irrelevant "Global" results or academic papers from appearing in news searches.
-   **Settings Persistence**: API Keys (Gemini, Custom Search, CX) are saved in the browser's `localStorage` and persist across reloads.
-   **Dual-Header Auth**: Search keys are passed via custom headers (`x-google-search-key`, `x-google-cse-id`) to the backend.
-   **Smart Fallback**: If keys are missing, the system gracefully shows a "Configuration Required" notification instead of crashing.

---

## 📂 Critical Files & Logic

### 1. `app/api/search/route.ts` (The Brain)
-   **Logic**:
    -   Receives `x-google-search-key` and `x-google-cse-id` headers.
    -   **If News/Media selected**:
        -   Loads `SOURCE_WHITELIST` from `@/app/config/whitelist`.
        -   Constructs a query: `USER_QUERY (site:nhk.or.jp OR site:nikkei.com ...)` (Top 20 domains).
        -   Executes Google Search.
        -   Maps results to `Paper` object with `country: 'Media'`.
    -   **If Papers selected**:
        -   Executes OpenAlex search.
    -   **Merges results** if both are selected.

### 2. `app/page.tsx` (The UI)
-   **Logic**:
    -   Manages state for `searchApiKey` and `searchEngineId`.
    -   **CRITICAL**: `handleSearch` and `handleLoadMore` MUST pass these keys in the `headers` object.
    -   Includes direct links to Google Cloud Console for key retrieval.

### 3. `app/config/whitelist.ts`
-   Contains the definition of `SOURCE_WHITELIST` (arrays for `news_jp`, `news_global`, etc.).
-   This list is the "Source of Truth" for the strict filter.

---

## 🚀 Recovery / Setup Steps

If you need to restart from scratch:

1.  **Install Dependencies**:
    ```bash
    npm install
    # Ensure @google/generative-ai and axios are installed
    ```

2.  **Verify Environment**:
    -   Ensure `app/config/whitelist.ts` exists.
    -   Ensure `app/api/search/route.ts` has the `site:` injection logic.

3.  **Run Server**:
    ```bash
    npm run dev
    ```

4.  **Client Setup (Browser)**:
    -   Open Settings (Gear Icon).
    -   Enter **Google API Key** (Gemini).
    -   Enter **Custom Search API Key**.
    -   Enter **Search Engine ID (CX)**.
    -   Click "Save".

## ⚠️ Maintenance Rules
-   **DO NOT** Change the `route.ts` search logic ("Strict Filter") unless the user explicitly asks to "loosen" strictness.
-   **DO NOT** Remove the header passing logic in `page.tsx`.
-   **Future Tweaks**: Only modify UI styling or minor text adjustments. Core search logic is "Golden".
