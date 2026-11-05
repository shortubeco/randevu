export interface BarDatum {
  label: string;
  value: number;
}

interface Props {
  data: BarDatum[];
  format: (n: number) => string;
  ariaLabel: string;
  color?: string;
}

// Tek seri, tek eksenli dikey çubuk grafik. Değerler çubuğun üstünde,
// ayrıntı title ile ipucu olarak gösterilir.
export default function BarChart({ data, format, ariaLabel, color = '#0d6efd' }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure aria-label={ariaLabel} className="mb-0">
      <div className="bar-chart">
        {data.map((d) => (
          <div key={d.label} className="bar-col" title={`${d.label}: ${format(d.value)}`}>
            <span className="bar-value">{d.value > 0 ? format(d.value) : ''}</span>
            <div
              className="bar"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 3 : 0, background: color }}
            />
          </div>
        ))}
      </div>
      <div className="bar-labels">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </figure>
  );
}
