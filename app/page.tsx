import { Suspense } from "react";
import Entry from "@/components/Entry";

/** 入口：「だれがやる？」→ その人が前に使った教科（/shakai・/rika）へ */
export default function Page() {
  // Entry が URL のクエリ（?to=rika・?pick=1）を読むため Suspense で囲む
  return (
    <Suspense>
      <Entry />
    </Suspense>
  );
}
