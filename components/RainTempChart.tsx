import type { Question } from "@/lib/types";

type Climate = NonNullable<Question["climate"]>;

const W = 360;
const H = 250;
const M = { top: 22, right: 44, bottom: 26, left: 40 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

/**
 * 雨温図：棒グラフが月降水量（右の目盛り）、折れ線が月平均気温（左の目盛り）。
 * 都市どうしを見比べやすいよう、目盛りは基本的に固定（気温 −10〜30℃、降水量 0〜500mm）にし、
 * はみ出すときだけ広げる。
 */
export default function RainTempChart({ climate }: { climate: Climate }) {
  const tMin = Math.min(-10, Math.floor(Math.min(...climate.temp) / 10) * 10);
  const tMax = Math.max(30, Math.ceil(Math.max(...climate.temp) / 10) * 10);
  const pMax = Math.max(500, Math.ceil(Math.max(...climate.precip) / 100) * 100);
  const pStep = pMax > 600 ? 200 : 100;

  const x = (i: number) => M.left + (PW / 12) * (i + 0.5);
  const yT = (t: number) => M.top + PH * (1 - (t - tMin) / (tMax - tMin));
  const yP = (p: number) => M.top + PH * (1 - p / pMax);
  const barW = (PW / 12) * 0.62;

  const tTicks = [];
  for (let t = tMin; t <= tMax; t += 10) tTicks.push(t);
  const pTicks = [];
  for (let p = 0; p <= pMax; p += pStep) pTicks.push(p);

  const line = climate.temp.map((t, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yT(t).toFixed(1)}`).join(" ");
  const label = `雨温図。年平均気温${climate.tempYear}℃、年降水量${Math.round(climate.precipYear)}mm。月別の気温：${climate.temp.join("、")}℃。月別の降水量：${climate.precip.map(Math.round).join("、")}mm。`;

  return (
    <span className="mx-auto block w-full max-w-md">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full">
        {/* 目盛り線（気温） */}
        {tTicks.map((t) => (
          <g key={`t${t}`}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={yT(t)}
              y2={yT(t)}
              stroke="var(--line)"
              strokeWidth={t === 0 ? 1.2 : 0.8}
            />
            <text x={M.left - 6} y={yT(t) + 4} textAnchor="end" fontSize="11" fill="var(--ng)">
              {t}
            </text>
          </g>
        ))}
        {/* 降水量の目盛り（右） */}
        {pTicks.map((p) => (
          <text key={`p${p}`} x={W - M.right + 6} y={yP(p) + 4} fontSize="11" fill="var(--accent)">
            {p}
          </text>
        ))}
        <text x={M.left - 6} y={12} textAnchor="end" fontSize="11" fill="var(--ng)">
          ℃
        </text>
        <text x={W - M.right + 6} y={12} fontSize="11" fill="var(--accent)">
          mm
        </text>

        {/* 降水量（棒） */}
        {climate.precip.map((p, i) => (
          <rect
            key={i}
            x={x(i) - barW / 2}
            y={yP(p)}
            width={barW}
            height={M.top + PH - yP(p)}
            fill="var(--accent)"
            opacity={0.55}
          />
        ))}
        {/* 気温（折れ線） */}
        <path d={line} fill="none" stroke="var(--ng)" strokeWidth={2.2} strokeLinejoin="round" />
        {climate.temp.map((t, i) => (
          <circle key={i} cx={x(i)} cy={yT(t)} r={3} fill="var(--ng)" />
        ))}

        {/* 月 */}
        {climate.temp.map((_, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
            {i + 1}
          </text>
        ))}
        <line x1={M.left} x2={W - M.right} y1={M.top + PH} y2={M.top + PH} stroke="var(--muted)" strokeWidth={1} />
      </svg>
      <span className="mt-1 flex justify-center gap-4 text-xs text-muted">
        <span>
          <span className="font-bold text-ng">━ </span>平均気温（年 {climate.tempYear}℃）
        </span>
        <span>
          <span className="font-bold text-accent">▮ </span>降水量（年 {Math.round(climate.precipYear).toLocaleString()}mm）
        </span>
      </span>
    </span>
  );
}
