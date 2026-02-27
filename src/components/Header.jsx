export default function Header({ lastUpdated, tab, onTabChange }) {
  const formatted = new Date(lastUpdated).toLocaleString()

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <h1 className="text-lg font-bold tracking-wider text-orange-500">
              BLOOMBERG LITE
            </h1>
          </div>
          <nav className="flex gap-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                tab === 'dashboard'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onTabChange('manage')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                tab === 'manage'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Manage
            </button>
          </nav>
        </div>
        <div className="text-xs text-gray-500">
          Updated {formatted}
        </div>
      </div>
    </header>
  )
}
