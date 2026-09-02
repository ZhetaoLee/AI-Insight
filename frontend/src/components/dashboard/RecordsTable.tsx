import { useState } from "react";
import type { GroupBreakdown, GroupRow } from "../../types/metrics";
import { abbreviate } from "../../lib/dashboardFormat";

interface RecordsTableProps {
  groupBreakdown: GroupBreakdown;
  eligibleTotal: number;
}

type SortKey = "name" | "respondents" | "adoption_rate" | "more_output_rate" | "avg_hours_saved" | "frequent_rework_rate";

const COLUMNS: { key: SortKey | "top_barrier"; label: string; align: "left" | "right"; sortable: boolean }[] = [
  { key: "name", label: "Group", align: "left", sortable: true },
  { key: "respondents", label: "Responses", align: "right", sortable: true },
  { key: "adoption_rate", label: "AI adoption rate", align: "right", sortable: true },
  { key: "more_output_rate", label: "Reports more output", align: "right", sortable: true },
  { key: "avg_hours_saved", label: "Avg hrs saved", align: "right", sortable: true },
  { key: "frequent_rework_rate", label: "Frequent rework", align: "right", sortable: true },
  { key: "top_barrier", label: "Top barrier", align: "left", sortable: false },
];

export function RecordsTable({ groupBreakdown, eligibleTotal }: RecordsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("adoption_rate");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  function fieldFor(row: GroupRow, key: SortKey): number | string {
    if (key === "name") return row.label;
    if (key === "respondents") return row.respondents;
    if (key === "adoption_rate") return row.adoption_rate ?? -1;
    if (key === "more_output_rate") return row.more_output_rate ?? -1;
    if (key === "avg_hours_saved") return row.avg_hours_saved ?? -1;
    return row.frequent_rework_rate ?? -1;
  }

  const rows = groupBreakdown.rows.slice().sort((a, b) => {
    const av = fieldFor(a, sortKey);
    const bv = fieldFor(b, sortKey);
    if (typeof av === "string" || typeof bv === "string") return String(av).localeCompare(String(bv)) * sortDir * -1;
    return (av - bv) * sortDir;
  });

  function handleSort(key: SortKey) {
    setSortDir((prevDir) => (sortKey === key ? ((-prevDir) as 1 | -1) : -1));
    setSortKey(key);
  }

  return (
    <div className="card table-card">
      <div className="table-head">
        <div className="card-title">Level records</div>
      </div>
      <div className="table-scroll">
        <table className="records-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={[!c.sortable ? "no-sort" : "", sortKey === c.key ? "active" : ""].join(" ").trim()}
                  style={{ textAlign: c.align }}
                  onClick={() => c.sortable && handleSort(c.key as SortKey)}
                >
                  {c.label}
                  {c.sortable && sortKey === c.key ? (sortDir === -1 ? "  ↓" : "  ↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const reworkPct = r.frequent_rework_rate ?? 0;
              const reworkHigh = reworkPct >= 30;
              return (
                <tr key={r.key}>
                  <td>
                    <div className="row-name">
                      <div className="row-abbr">{abbreviate(r.label)}</div>
                      <div className="row-name-text">{r.label}</div>
                    </div>
                  </td>
                  <td className="cell-numeric">
                    {r.respondents} / {r.eligible_employees}
                  </td>
                  <td>
                    <div className="cell-bar">
                      <div className="cell-bar-track">
                        <div className="cell-bar-fill" style={{ width: `${r.adoption_rate ?? 0}%`, background: "#1f9d7c" }} />
                      </div>
                      <div className="cell-bar-value">{r.adoption_rate != null ? `${r.adoption_rate}%` : "—"}</div>
                    </div>
                  </td>
                  <td>
                    <div className="cell-bar">
                      <div className="cell-bar-track">
                        <div className="cell-bar-fill" style={{ width: `${r.more_output_rate ?? 0}%`, background: "#7fcfb5" }} />
                      </div>
                      <div className="cell-bar-value">{r.more_output_rate != null ? `${r.more_output_rate}%` : "—"}</div>
                    </div>
                  </td>
                  <td className="cell-numeric">{r.avg_hours_saved != null ? `${r.avg_hours_saved.toFixed(1)} h` : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <span
                      className="rework-pill"
                      style={{ background: reworkHigh ? "#fdece9" : "#f2f4f5", color: reworkHigh ? "#c2564a" : "#5d6874" }}
                    >
                      {r.respondents ? `${reworkPct}%` : "—"}
                    </span>
                  </td>
                  <td style={{ color: "#6d7783" }}>{r.top_barrier ? r.top_barrier.label : "No major barriers"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <div>Seeded demonstration data · {eligibleTotal} eligible employees · fielded Q3 2026</div>
        <div>"Not sure" excluded from numeric metrics · denominators shown per metric</div>
      </div>
    </div>
  );
}
