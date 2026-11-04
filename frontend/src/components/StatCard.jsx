export default function StatCard({ label, value, icon: Icon, sub, trend }) {
  return (
    <div className="card p-5 hover:border-ink/20 transition-colors duration-150 flex flex-col justify-between min-h-[110px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink-muted">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-ink-faint flex-shrink-0" strokeWidth={1.75} />}
      </div>
      <div className="mt-3">
        <div className="text-[28px] font-semibold text-ink font-geist tabular-nums tracking-tight leading-none">
          {value}
        </div>
        {sub && <p className="text-xs text-ink-faint mt-2">{sub}</p>}
        {trend !== undefined && (
          <p className={`text-xs font-medium mt-2 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs yesterday
          </p>
        )}
      </div>
    </div>
  )
}
