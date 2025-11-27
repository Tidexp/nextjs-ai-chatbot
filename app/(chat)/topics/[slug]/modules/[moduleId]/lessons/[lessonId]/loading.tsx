export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navigation bar skeleton */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4">
          <nav className="flex items-center h-[56px] gap-2 md:gap-4 animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-32" />
            <div className="h-4 w-4 bg-slate-200 rounded" />
            <div className="h-8 bg-slate-200 rounded w-40" />
          </nav>
        </div>
      </div>

      {/* Main content layout */}
      <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0">
        {/* Left sidebar skeleton */}
        <div className="hidden lg:block bg-white border-r border-slate-200 min-h-[calc(100vh-56px)]">
          <div className="sticky top-[56px] p-4 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* Main content area skeleton */}
        <div className="p-4 md:p-8">
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {/* Content card skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 animate-pulse">
              <div className="p-6">
                <div className="h-10 bg-slate-200 rounded w-3/4 mb-6" />
                <div className="space-y-3">
                  <div className="h-4 bg-slate-100 rounded" />
                  <div className="h-4 bg-slate-100 rounded" />
                  <div className="h-4 bg-slate-100 rounded w-5/6" />
                  <div className="h-4 bg-slate-100 rounded" />
                  <div className="h-4 bg-slate-100 rounded w-4/5" />
                </div>
              </div>
            </div>

            {/* Exercise panel skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 animate-pulse">
              <div className="p-6">
                <div className="h-6 bg-slate-200 rounded w-1/2 mb-4" />
                <div className="h-64 bg-slate-50 rounded border border-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
