'use client';
import React, { useMemo, useState } from 'react';
import type { Topic } from '@/lib/db/schema';
import Link from 'next/link';
import { cn } from '@/lib/utils'; // if utils has cn helper; fallback local if missing

// Fallback if cn not present
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fallbackCn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
const merge = typeof cn === 'function' ? cn : fallbackCn;

interface TopicExplorerProps {
  topics: Topic[];
}

const gradients = [
  'from-rose-500/25 via-fuchsia-500/25 to-indigo-500/25',
  'from-sky-500/25 via-cyan-500/25 to-teal-500/25',
  'from-emerald-500/25 via-lime-500/25 to-yellow-500/25',
  'from-orange-500/25 via-rose-500/25 to-pink-500/25',
  'from-indigo-500/25 via-purple-500/25 to-pink-500/25',
];

function gradientFor(idx: number) {
  return gradients[idx % gradients.length];
}

export const TopicExplorer: React.FC<TopicExplorerProps> = ({ topics }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    topics.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [topics]);

  const filtered = useMemo(() => {
    return topics.filter((t) => {
      const matchesQuery =
        !query ||
        (t.title + (t.description || '') + (t.category || ''))
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesCategory = !category || t.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [topics, query, category]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Explore Topics
          </h1>
          <p className="text-sm text-muted-foreground max-w-prose">
            Discover learning paths crafted for curiosity. Filter, search & dive
            in.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics..."
            className="h-10 w-full md:w-64 rounded-md border bg-background/60 backdrop-blur px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
          />
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory(null)}
                className={merge(
                  'px-3 py-1 rounded-full text-xs font-medium border transition',
                  !category
                    ? 'bg-indigo-500 text-white border-indigo-500 shadow'
                    : 'hover:bg-indigo-500/10',
                )}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c === category ? null : c)}
                  className={merge(
                    'px-3 py-1 rounded-full text-xs font-medium border transition',
                    category === c
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-pink-500 shadow'
                      : 'hover:bg-pink-500/10',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t, idx) => (
          <Link
            href={`/topics/${t.slug}`}
            key={t.id}
            className={merge(
              'group relative overflow-hidden rounded-xl border bg-background/70 backdrop-blur shadow-sm transition hover:shadow-lg hover:-translate-y-1',
              'hover:border-indigo-500/40',
            )}
          >
            <div
              className={merge(
                'absolute inset-0 bg-gradient-to-br opacity-40 group-hover:opacity-60 transition',
                gradientFor(idx),
              )}
            />
            <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(circle_at_30%_20%,white,transparent_70%)]" />
            <div className="relative p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded-md bg-black/10 dark:bg-white/10 backdrop-blur border text-muted-foreground">
                  {t.category || 'General'}
                </span>
                <span className="text-[10px] font-mono opacity-60">↗</span>
              </div>
              <h2 className="font-semibold text-lg leading-tight line-clamp-2">
                {t.title}
              </h2>
              {t.description && (
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {t.description}
                </p>
              )}
              <div className="mt-auto pt-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:underline">
                  Start Learning
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12h14M12 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 border rounded-xl">
            <p className="text-sm text-muted-foreground">
              No topics match your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicExplorer;
