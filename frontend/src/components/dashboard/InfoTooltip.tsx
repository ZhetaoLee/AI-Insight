import { useId } from "react";

interface InfoTooltipProps {
  label: string;
  children: string;
}

export function InfoTooltip({ label, children }: InfoTooltipProps) {
  const tooltipId = useId();

  return (
    <button type="button" className="info-help" aria-label={label} aria-describedby={tooltipId}>
      i
      <span id={tooltipId} className="info-tooltip" role="tooltip">
        {children}
      </span>
    </button>
  );
}
