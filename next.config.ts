import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 今はサーバー処理がないので静的ファイルとして書き出し、Cloudflare Pages に置く（出力先: out/）。
  // ログインや Stripe を入れるときは外して @opennextjs/cloudflare（Workers）に移る。
  output: "export",
};

export default nextConfig;
