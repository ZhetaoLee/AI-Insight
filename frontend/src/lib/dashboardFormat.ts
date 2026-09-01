export function abbreviate(name: string): string {
  const words = name.split(/[\s/]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

export function shortGroupLabel(label: string): string {
  const overrides: Record<string, string> = { Infrastructure: "Infra.", "Senior Director": "Sr. Dir." };
  return overrides[label] ?? label;
}

export const DASHBOARD_ACCENT = "#1f9d7c";
