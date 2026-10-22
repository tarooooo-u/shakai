import type { Metadata } from "next";
import RikaApp from "@/components/rika/RikaApp";

export const metadata: Metadata = {
  title: "理科ドリル｜中学受験 理科の一問一答",
  description: "中学受験の理科（生物・地学・化学の一部）の知識と図を確認できる一問一答。",
};

export default function Page() {
  return <RikaApp />;
}
