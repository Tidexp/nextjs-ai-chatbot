export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6 flex items-center gap-2 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-32" />
        <div className="h-4 bg-slate-200 rounded w-4" />
        <div className="h-4 bg-slate-200 rounded w-40" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-3/4 mb-6" />
            <div className="space-y-3 mb-8">
              <div className="h-4 bg-slate-100 rounded" />
              <div className="h-4 bg-slate-100 rounded" />
              <div className="h-4 bg-slate-100 rounded w-5/6" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-slate-50 rounded-xl border border-slate-200"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
            <div className="h-2 bg-slate-100 rounded mb-6" />
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="h-16 bg-slate-50 rounded-xl" />
              <div className="h-16 bg-slate-50 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
