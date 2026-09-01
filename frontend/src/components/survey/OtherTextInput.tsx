interface OtherTextInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export function OtherTextInput({ value, onChange, error }: OtherTextInputProps) {
  return (
    <input
      type="text"
      className="other-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Please specify"
      style={{ borderColor: error ? "var(--color-error)" : undefined }}
    />
  );
}
