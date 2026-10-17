import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 画面は静的ファイルとして書き出し、Cloudflare Pages に置く（出力先: out/）。
  // サーバー処理（学習記録の同期）は Next ではなく Pages Functions（functions/）に書く。
  // 一般公開でログインや Stripe を入れるときは、@opennextjs/cloudflare（Workers）に移ることも考える。
  output: "export",
};

export default nextConfig;
