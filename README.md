# AI Project Diagnostic System

AIプロジェクトの「死亡確率」を診断する営業装置。

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Recharts

## ローカル開発

```bash
npm install
npm run dev
```

## GitHub → Vercel デプロイ手順

1. このフォルダをGitHubリポジトリにpush
2. [vercel.com](https://vercel.com) でNew Project
3. GitHubリポジトリを選択 → Deploy
4. 設定はデフォルトのまま（Vercelが自動でNext.jsを検出）

## カスタマイズ

### CTAリンク先を変更
`components/DiagnosticApp.tsx` の `/contact` をカレンダーURLや外部フォームURLに変更。

```tsx
// 例: Calendly
window.location.href = "https://calendly.com/your-name/30min"
```

### 連絡先ページをカスタマイズ
`app/contact/page.tsx` にCalendlyやGoogleフォームの埋め込みコードを追加。

## ファイル構成

```
app/
  layout.tsx          # メタデータ・OGP設定
  page.tsx            # / → /diagnostic にリダイレクト
  diagnostic/
    page.tsx          # 診断ページ
  contact/
    page.tsx          # CTA遷移先（カスタマイズ要）
  globals.css

components/
  DiagnosticApp.tsx   # メインコンポーネント（全ロジック）
```
