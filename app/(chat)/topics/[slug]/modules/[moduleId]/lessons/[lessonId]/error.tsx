'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function LessonError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Lesson page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Oops! Something went wrong
        </h2>
        <p className="text-slate-600 mb-6">
          We encountered an error while loading this lesson. This might be due
          to rapid navigation.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm hover:shadow-md"
          >
            Try Again
          </button>
          <Link
            href="/topics"
            className="text-slate-600 hover:text-indigo-600 transition-colors text-sm"
          >
            ← Back to Topics
          </Link>
        </div>
      </div>
    </div>
  );
}
