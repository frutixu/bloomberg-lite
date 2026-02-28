export default function Header({ lastUpdated, tab, onTabChange }) {
  let formatted = '—'
  try {
    const d = new Date(lastUpdated)
    if (!isNaN(d.getTime())) formatted = d.toLocaleString()
  } catch { /* noop */ }

  return (
    <header className="border-b border-bb-border-hi bg-bb-bg/90 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-bb-amber animate-pulse" />
            <h1 className="text-sm font-bold tracking-[0.2em] text-bb-amber">BLOOMBERG LITE</h1>
          </div>
          <nav className="flex gap-0.5">
            {['dashboard', 'manage'].map(t => (
              <button
                key={t}
                onClick={() => onTabChange(t)}
                className={`px-3 py-1 text-xxs font-medium uppercase tracking-wider rounded transition-colors ${
                  tab === t ? 'bg-bb-amber/15 text-bb-amber' : 'text-bb-muted hover:text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xxs text-bb-muted-dim">{formatted}</div>
          <button
            onClick={() => window.location.reload()}
            className="text-bb-muted hover:text-bb-amber transition-colors p-1"
            title="Refresh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.681.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-.908l.84.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44.908l-.84-.84v1.769a.75.75 0 0 1-1.5 0V9.637a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.681.75.75 0 0 1 1.025-.274Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
