import { useState } from "react";
import type { ValueAreaRanking } from "../../types/metrics";

interface ValueAreaRankingCardProps {
  ranking: ValueAreaRanking;
}

export function ValueAreaRankingCard({ ranking }: ValueAreaRankingCardProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const max = Math.max(1, ...ranking.rows.map((r) => r.total));
  const hovered = hoverIdx !== null ? ranking.rows[hoverIdx] : null;

  const hint = hovered
    ? hovered.code === "other" && Object.keys(hovered.otherTexts).length
      ? "Other · " + Object.entries(hovered.otherTexts).map(([t, c]) => `${t} (${c})`).join(" · ")
      : `${hovered.label} · rank 1: ${hovered.rank1} · rank 2: ${hovered.rank2} · rank 3: ${hovered.rank3}`
    : 'Sorted by total votes, then rank 1, rank 2, rank 3. Hover a row for the rank split; hover "Other" for the submitted text.';

  return (
    <div className="card value-area-card">
      <div className="value-area-head">
        <div>
          <div className="card-title">AI value area ranking</div>
          <div className="card-eyebrow">Q2 · ranked top three · n = {ranking.denominator}</div>
        </div>
        <div className="value-area-legend">
          <div className="legend-item">
            <div className="legend-swatch" style={{ background: "#1d3f8f" }} />
            Rank 1
          </div>
          <div className="legend-item">
            <div className="legend-swatch" style={{ background: "#4d7fd6" }} />
            Rank 2
          </div>
          <div className="legend-item">
            <div className="legend-swatch" style={{ background: "#adc7ef" }} />
            Rank 3
          </div>
        </div>
      </div>
      <div className="value-area-rows">
        {ranking.rows.map((r, idx) => (
          <div
            key={r.code}
            className="value-area-row"
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <div className="value-area-label" style={{ color: hoverIdx === idx ? "#1f2a37" : "#5d6874" }}>
              {r.label}
            </div>
            <div className="value-area-bar-track">
              <div className="value-area-bar-fill" style={{ width: `${Math.round((r.total / max) * 100)}%` }}>
                <div style={{ flex: r.rank1 || 0.0001, background: "#1d3f8f" }} />
                <div style={{ flex: r.rank2 || 0.0001, background: "#4d7fd6" }} />
                <div style={{ flex: r.rank3 || 0.0001, background: "#adc7ef" }} />
              </div>
            </div>
            <div className="value-area-total">{r.total}</div>
          </div>
        ))}
      </div>
      <div className="card-hint">{hint}</div>
    </div>
  );
}
