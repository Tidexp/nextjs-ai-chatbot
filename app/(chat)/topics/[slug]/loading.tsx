export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Hero skeleton */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/10 via-violet-600/10 to-fuchsia-600/10 p-8 shadow-lg animate-pulse">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-xl bg-slate-200" />
          <div className="flex-1">
            <div className="h-8 bg-slate-200 rounded w-1/3 mb-3" />
            <div className="h-4 bg-slate-200 rounded w-2/3 mb-4" />
            <div className="flex gap-3">
              <div className="h-6 bg-slate-200 rounded w-24" />
              <div className="h-6 bg-slate-200 rounded w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Modules grid skeleton */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse"
          >
            <div className="h-6 bg-slate-200 rounded w-3/4 mb-3" />
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
            <div className="space-y-2 mb-4">
              <div className="h-8 bg-slate-100 rounded" />
              <div className="h-8 bg-slate-100 rounded" />
              <div className="h-8 bg-slate-100 rounded" />
            </div>
            <div className="h-10 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
