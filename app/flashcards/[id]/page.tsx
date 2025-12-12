'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Params = { id: string };

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface FlashcardDeck {
  id: string;
  title: string;
  cards: Flashcard[];
  sourceTitles?: string[];
  createdAt?: string;
}

export default function FlashcardPage({
  params,
}: {
  params: Promise<Params> | Params;
}) {
  const router = useRouter();
  const resolvedParams =
    typeof (params as any)?.then === 'function'
      ? use(params as Promise<Params>)
      : (params as Params);

  const searchParams = useSearchParams();
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [answered, setAnswered] = useState<Set<string>>(new Set());

  // Load deck from sessionStorage (written by quick action) or payload param
  useEffect(() => {
    const stored =
      typeof window !== 'undefined'
        ? sessionStorage.getItem(`instructor-flashcards-${resolvedParams.id}`)
        : null;
    if (stored) {
      try {
        setDeck(JSON.parse(stored));
        return;
      } catch (error) {
        console.error('Failed to parse stored deck', error);
      }
    }

    const payload = searchParams.get('payload');
    if (payload) {
      try {
        const decoded = JSON.parse(decodeURIComponent(payload));
        setDeck(decoded);
        // also cache for refresh in this tab
        sessionStorage.setItem(
          `instructor-flashcards-${resolvedParams.id}`,
          JSON.stringify(decoded),
        );
      } catch (error) {
        console.error('Failed to parse payload query', error);
      }
    }
  }, [resolvedParams.id, searchParams]);

  const progress = useMemo(() => {
    if (!deck) return 0;
    return Math.round((answered.size / deck.cards.length) * 100);
  }, [answered.size, deck]);

  const currentCard = deck?.cards[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleMarkDone = () => {
    if (currentCard) {
      setAnswered((prev) => new Set([...prev, currentCard.id]));
    }
  };

  const handleNext = () => {
    if (deck && currentIndex < deck.cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setAnswered(new Set());
  };

  if (!deck) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold">Flashcard deck not found</h1>
        <p className="text-muted-foreground mt-2">
          Please create a flashcard deck from the Instructor Studio and try
          again.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          ← Back
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground tracking-wide">
            Study Deck
          </p>
          <h1 className="text-2xl font-semibold">{deck.title}</h1>
          {deck.sourceTitles?.length ? (
            <p className="text-sm text-muted-foreground mt-1">
              Sources: {deck.sourceTitles.join(', ')}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Progress</p>
          <p className="text-2xl font-bold">
            {answered.size} / {deck.cards.length}
          </p>
          <div className="w-48 h-2 bg-muted rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {currentCard && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Card {currentIndex + 1} of {deck.cards.length}
          </div>

          <div
            onClick={handleFlip}
            className="relative h-48 cursor-pointer"
            style={{ perspective: '1000px' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleFlip();
              }
            }}
            aria-label={isFlipped ? 'Show question' : 'Show answer'}
          >
            <div
              className="relative w-full h-full transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front face */}
              <div
                className="absolute inset-0 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-8 flex items-center justify-center"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <div className="text-center space-y-2">
                  <p className="text-xs uppercase text-muted-foreground">
                    Question
                  </p>
                  <p className="text-lg font-medium leading-relaxed">
                    {currentCard.front}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click to reveal answer
                  </p>
                </div>
              </div>

              {/* Back face */}
              <div
                className="absolute inset-0 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/30 p-8 flex items-center justify-center"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="text-center space-y-2">
                  <p className="text-xs uppercase text-muted-foreground">
                    Answer
                  </p>
                  <p className="text-lg font-medium leading-relaxed">
                    {currentCard.back}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click to reveal question
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                ← Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleNext}
                disabled={currentIndex === deck.cards.length - 1}
              >
                Next →
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={answered.has(currentCard.id) ? 'default' : 'outline'}
                onClick={handleMarkDone}
              >
                {answered.has(currentCard.id) ? '✓ Learned' : 'Mark as learned'}
              </Button>
              {answered.size > 0 && (
                <Button type="button" variant="outline" onClick={handleReset}>
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
