export default function Header({ lastUpdated, tab, onTabChange }) {
  const formatted = new Date(lastUpdated).toLocaleString()

  return (
    <header className="border-b border-bb-border-hi bg-bb-bg/90 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-bb-amber animate-pulse" />
            <h1 className="text-sm font-bold tracking-[0.2em] text-bb-amber">
              BLOOMBERG LITE
            </h1>
          </div>
          <nav className="flex gap-0.5">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-1 text-xxs font-medium uppercase tracking-wider rounded transition-colors ${
                tab === 'dashboard'
                  ? 'bg-bb-amber/15 text-bb-amber'
                  : 'text-bb-muted hover:text-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onTabChange('manage')}
              className={`px-3 py-1 text-xxs font-medium uppercase tracking-wider rounded transition-colors ${
                tab === 'manage'
                  ? 'bg-bb-amber/15 text-bb-amber'
                  : 'text-bb-muted hover:text-gray-300'
              }`}
            >
              Manage
            </button>
          </nav>
        </div>
        <div className="text-xxs text-bb-muted-dim">
          {formatted}
        </div>
      </div>
    </header>
  )
}
