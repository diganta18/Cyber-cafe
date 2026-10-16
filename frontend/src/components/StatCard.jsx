export default function StatCard({ label, value, icon: Icon, color = 'blue', sub, trend }) {
  const palettes = {
    blue:   { bg: 'bg-accent/10',   icon: 'text-accent',   border: 'border-l-accent'   },
    cyan:   { bg: 'bg-accent/10',   icon: 'text-accent',   border: 'border-l-accent'   },
    green:  { bg: 'bg-success/10',  icon: 'text-success',  border: 'border-l-success'  },
    amber:  { bg: 'bg-warning/10',  icon: 'text-warning',  border: 'border-l-warning'  },
    red:    { bg: 'bg-danger/10',   icon: 'text-danger',   border: 'border-l-danger'   },
    purple: { bg: 'bg-accent/10',   icon: 'text-accent',   border: 'border-l-accent'   },
  }
  const p = palettes[color] || palettes.blue

  return (
    <div className={`card p-5 flex items-start gap-4 border-l-4 ${p.border} hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200`}>
      {Icon && (
        <div className={`rounded-xl p-2.5 ${p.bg} flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${p.icon}`} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-widest truncate">{label}</p>
        <p className="text-2xl font-bold text-ink mt-1 tabular-nums leading-none">{value}</p>
        {sub && <p className="text-xs text-ink-faint mt-1.5">{sub}</p>}
        {trend !== undefined && (
          <p className={`text-xs font-semibold mt-1.5 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs yesterday
          </p>
        )}
      </div>
    </div>
  )
}
