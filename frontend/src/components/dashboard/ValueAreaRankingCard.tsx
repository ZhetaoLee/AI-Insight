import type { ValueAreaRanking } from "../../types/metrics";
import { OTHER_CODE } from "../../types/survey";
import { InfoTooltip } from "./InfoTooltip";

interface ValueAreaRankingCardProps {
  ranking: ValueAreaRanking;
}

const RANK_SEGMENTS = [
  { key: "rank1", label: "1st", legendLabel: "Rank 1", color: "#1d3f8f" },
  { key: "rank2", label: "2nd", legendLabel: "Rank 2", color: "#4d7fd6" },
  { key: "rank3", label: "3rd", legendLabel: "Rank 3", color: "#adc7ef" },
] as const;

function formatOtherTextCount([text, count]: [string, number]) {
  return `${text} (${count})`;
}

export function ValueAreaRankingCard({ ranking }: ValueAreaRankingCardProps) {
  const max = Math.max(1, ...ranking.rows.map((r) => r.total));
  const helpText =
    "Q2 ranks each respondent's top three AI value areas. Bars are sorted by total votes, then first-, second-, and third-place votes.";

  return (
    <div className="card value-area-card">
      <div className="value-area-head">
        <div className="value-area-title-row">
          <div className="card-title">AI value area ranking</div>
          <InfoTooltip label="AI value area ranking help">{helpText}</InfoTooltip>
        </div>
        <div className="value-area-legend">
          {RANK_SEGMENTS.map((rank) => (
            <div className="legend-item" key={rank.key}>
              <div className="legend-swatch" style={{ background: rank.color }} />
              {rank.legendLabel}
            </div>
          ))}
        </div>
      </div>
      <div className="value-area-rows">
        {ranking.rows.map((r) => {
          const otherTexts = Object.entries(r.otherTexts);
          const hasOtherText = r.code === OTHER_CODE && otherTexts.length > 0;

          return (
            <div
              key={r.code}
              className="value-area-row"
              tabIndex={0}
              aria-label={`${r.label}. Total ${r.total}. First place ${r.rank1}, second place ${r.rank2}, third place ${r.rank3}.`}
            >
              <div className="value-area-label">{r.label}</div>
              <div className="value-area-bar-track">
                <div className="value-area-bar-fill" style={{ width: `${Math.round((r.total / max) * 100)}%` }}>
                  {RANK_SEGMENTS.map((rank) => (
                    <div key={rank.key} style={{ flex: r[rank.key] || 0.0001, background: rank.color }} />
                  ))}
                </div>
              </div>
              <div className="value-area-total">{r.total}</div>
              <div className="value-area-tooltip" role="tooltip">
                <div className="value-area-tooltip-title">{r.label}</div>
                <div className="rank-counts" aria-hidden="true">
                  {RANK_SEGMENTS.map((rank) => (
                    <span className="rank-count-chip" key={rank.key}>
                      <span className="rank-count-dot" style={{ background: rank.color }} />
                      <span>{rank.label}</span>
                      <strong>{r[rank.key]}</strong>
                    </span>
                  ))}
                </div>
                {hasOtherText ? (
                  <div className="value-area-other-texts">
                    {otherTexts.map((entry) => (
                      <span className="value-area-other-text" key={entry[0]}>
                        {formatOtherTextCount(entry)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="value-area-caption">
        Sorted by total votes, then 1st, 2nd, and 3rd place votes. Hover or focus a row for details.
      </div>
    </div>
  );
}
