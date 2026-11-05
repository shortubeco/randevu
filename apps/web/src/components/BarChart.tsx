export interface BarDatum {
  label: string;
  value: number;
}

interface Props {
  data: BarDatum[];
  format: (n: number) => string;
  ariaLabel: string;
}

// Tek seri, tek eksenli dikey çubuk grafik. Renk tek ton; değerler çubuğun üstünde
// ve title ile ipucu olarak gösterilir. Erişilebilirlik için aynı veriler
// aria-label ve etiketlerle de okunabilir.
export default function BarChart({ data, format, ariaLabel }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure aria-label={ariaLabel} className="space-y-1">
      <div className="flex h-44 items-end gap-1.5 border-b border-slate-200">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex h-full flex-1 flex-col items-center justify-end"
            title={`${d.label}: ${format(d.value)}`}
          >
            <span className="mb-1 text-[10px] text-slate-500">{d.value > 0 ? format(d.value) : ''}</span>
            <div
              className="w-full rounded-t bg-slate-700 transition-colors hover:bg-slate-500"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[10px] text-slate-500">
            {d.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
