export function RangeControl({
  id,
  label,
  value,
  min,
  max,
  step,
  suffix = 'x',
  displayValue,
  onChange
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  displayValue?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-control" htmlFor={id}>
      <span>
        {label}
        <strong>
          {displayValue ?? `${value.toFixed(step < 1 ? 2 : 0)}${suffix}`}
        </strong>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
