export default function StatCard({ label, value, icon: Icon, sub, trend, valueClass = '', iconClass = '' }) {
  return (
    <div className="card p-5 flex flex-col justify-between min-h-[110px] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#2A2407] transition-all">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">{label}</span>
        {Icon && <Icon className={`h-4 w-4 text-ink flex-shrink-0 ${iconClass}`} strokeWidth={2} />}
      </div>
      <div className="mt-3">
        <div className={`text-[28px] font-extrabold text-ink font-geist tabular-nums tracking-tight leading-none ${valueClass}`}>
          {value}
        </div>
        {sub && <p className="text-xs text-ink-muted mt-2 font-medium">{sub}</p>}
        {trend !== undefined && (
          <p className={`text-xs font-bold mt-2 ${trend >= 0 ? 'text-accent' : 'text-danger'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs yesterday
          </p>
        )}
      </div>
    </div>
  )
}
