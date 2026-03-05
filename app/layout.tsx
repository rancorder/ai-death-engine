import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIプロジェクト死亡確率診断 | AI Project Diagnostic",
  description:
    "6つの質問でAI導入プロジェクトの死亡確率・構造健全性・改善シミュレーションを診断します。PoC止まりのリスクを今すぐ把握してください。",
  openGraph: {
    title: "AIプロジェクト死亡確率診断",
    description: "あなたのAIプロジェクトが量産移行できずに終わる確率を診断します。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
