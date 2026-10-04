import { IMAGES } from "@/data";

/** 画像・統計データの出典。CC BY / CC BY-SA の画像は作者とライセンスの表示が必要 */
export default function Credits() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">画像・データの出典</h1>
        <p className="mt-1 text-sm text-muted">
          問題で使っている画像は Wikimedia Commons から、ライセンスに従って利用しています。
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xs font-bold tracking-wider text-muted">データ</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>統計データの一部は、政府統計総合窓口(e-Stat)のAPI機能を使用して取得しています。サービスの内容は国によって保証されたものではありません。</li>
          <li>雨温図は気象庁の平年値（1991〜2020年）をもとに作成しています（出典：気象庁ホームページ）。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold tracking-wider text-muted">画像（{IMAGES.length}点）</h2>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {IMAGES.map((i) => (
            <li key={i.name} className="flex items-center gap-3 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しのため next/image は使わない */}
              <img src={i.src} alt="" loading="lazy" className="size-14 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 text-xs leading-relaxed">
                <div className="text-sm font-bold">{i.name}</div>
                <div className="text-muted">
                  作者：{i.artist}／{i.license}
                </div>
                <a href={i.url} target="_blank" rel="noopener noreferrer" className="break-all text-accent underline">
                  {i.file}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
