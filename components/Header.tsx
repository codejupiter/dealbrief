/**
 * components/Header.tsx
 *
 * Minimal header. Project name, GitHub link, a quiet model attribution.
 */

export function Header() {
    return (
      <header
        className="border-b px-6 lg:px-10 py-4 flex items-center justify-between"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center font-semibold text-sm"
            style={{
              background: 'hsl(var(--accent-muted))',
              color: 'hsl(var(--accent-strong))',
            }}
          >
            db
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold tracking-tight">dealbrief</h1>
            <span
              className="text-xs tabular-nums"
              style={{ color: 'hsl(var(--muted))' }}
            >
              agentic deal intelligence
            </span>
          </div>
        </div>
  
        <div className="flex items-center gap-4 text-xs" style={{ color: 'hsl(var(--muted))' }}>
          <span className="hidden sm:inline">
            Built with Claude · Voyage AI
          </span>
          <a
            href="https://github.com/codejupiter/dealbrief"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-current transition-colors"
            style={{ color: 'hsl(var(--muted-strong))' }}
          >
            GitHub →
          </a>
        </div>
      </header>
    );
  }
  