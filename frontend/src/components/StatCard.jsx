export default function StatCard({ label, value, icon: Icon, color = 'blue', sub, trend }) {
  const palettes = {
    blue:   { bg: 'bg-accent/10',   icon: 'text-accent',  border: 'border-l-accent',  glow: 'shadow-[0_0_12px_rgba(59,122,87,0.08)]'  },
    cyan:   { bg: 'bg-accent/10',   icon: 'text-accent',  border: 'border-l-accent',  glow: 'shadow-[0_0_12px_rgba(59,122,87,0.08)]'  },
    green:  { bg: 'bg-success/10',  icon: 'text-success', border: 'border-l-success', glow: 'shadow-[0_0_12px_rgba(46,133,85,0.08)]'  },
    amber:  { bg: 'bg-warning/10',  icon: 'text-warning', border: 'border-l-warning', glow: 'shadow-[0_0_12px_rgba(217,155,38,0.08)]' },
    red:    { bg: 'bg-danger/10',   icon: 'text-danger',  border: 'border-l-danger',  glow: 'shadow-[0_0_12px_rgba(201,74,74,0.08)]'  },
    purple: { bg: 'bg-accent/10',   icon: 'text-accent',  border: 'border-l-accent',  glow: 'shadow-[0_0_12px_rgba(59,122,87,0.08)]'  },
  }
  const p = palettes[color] || palettes.blue

  return (
    <div className={`card p-5 flex items-start gap-4 border-l-[3px] ${p.border} hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200`}>
      {Icon && (
        <div className={`rounded-xl p-2.5 ${p.bg} flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${p.icon}`} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-ink-faint uppercase tracking-[0.12em] truncate">{label}</p>
        <p className="text-[26px] font-bold text-ink mt-1.5 tabular-nums leading-none tracking-tight">{value}</p>
        {sub && <p className="text-xs text-ink-muted mt-1.5">{sub}</p>}
        {trend !== undefined && (
          <p className={`text-xs font-semibold mt-1.5 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs yesterday
          </p>
        )}
      </div>
    </div>
  )
}
