'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Params = { id: string };

interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  sourceTitle?: string;
}

interface MCQTest {
  id: string;
  title: string;
  questions: MCQQuestion[];
  sourceTitles?: string[];
  createdAt?: string;
}

export default function TestPage({
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
  const [test, setTest] = useState<MCQTest | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  // Load test payload from sessionStorage (written by quick action) or payload param
  useEffect(() => {
    const stored =
      typeof window !== 'undefined'
        ? sessionStorage.getItem(`instructor-test-${resolvedParams.id}`)
        : null;
    if (stored) {
      try {
        setTest(JSON.parse(stored));
        return;
      } catch (error) {
        console.error('Failed to parse stored test', error);
      }
    }

    const payload = searchParams.get('payload');
    if (payload) {
      try {
        const decoded = JSON.parse(decodeURIComponent(payload));
        setTest(decoded);
        // also cache for refresh in this tab
        sessionStorage.setItem(
          `instructor-test-${resolvedParams.id}`,
          JSON.stringify(decoded),
        );
      } catch (error) {
        console.error('Failed to parse payload query', error);
      }
    }
  }, [resolvedParams.id, searchParams]);

  const score = useMemo(() => {
    if (!submitted || !test) return null;
    const total = test.questions.length;
    const correct = test.questions.reduce((count, q) => {
      const answer = answers[q.id];
      return count + (answer === q.correctIndex ? 1 : 0);
    }, 0);
    return { correct, total };
  }, [answers, submitted, test]);

  const handleSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = () => {
    if (!test) return;
    if (Object.keys(answers).length < test.questions.length) {
      alert('Please answer every question before submitting.');
      return;
    }
    setSubmitted(true);
  };

  const handleRetake = () => {
    setSubmitted(false);
    setAnswers({});
  };

  if (!test) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold">Test not found</h1>
        <p className="text-muted-foreground mt-2">
          Please create a test from the Instructor Studio and try again.
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
            Knowledge Check
          </p>
          <h1 className="text-2xl font-semibold">{test.title}</h1>
          {test.sourceTitles?.length ? (
            <p className="text-sm text-muted-foreground mt-1">
              Sources: {test.sourceTitles.join(', ')}
            </p>
          ) : null}
        </div>
        {submitted && score ? (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Score</p>
            <p className="text-2xl font-bold">
              {score.correct} / {score.total}
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {test.questions.map((q, idx) => {
          const selected = answers[q.id];
          const isCorrect = submitted && selected === q.correctIndex;
          const isIncorrect = submitted && selected !== undefined && !isCorrect;

          return (
            <div
              key={q.id}
              className="border rounded-lg p-4 bg-card shadow-sm space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                  {idx + 1}
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium leading-snug">{q.question}</p>
                    {submitted ? (
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-700'
                            : isIncorrect
                              ? 'bg-red-100 text-red-700'
                              : 'bg-muted text-foreground'
                        }`}
                      >
                        {isCorrect ? 'Correct' : isIncorrect ? 'Review' : '—'}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => {
                      const selectedThis = selected === optIdx;
                      const isAnswer = submitted && optIdx === q.correctIndex;
                      return (
                        <button
                          key={`${q.id}-${optIdx}`}
                          type="button"
                          onClick={() => handleSelect(q.id, optIdx)}
                          className={`w-full text-left border rounded-md px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary ${
                            selectedThis
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/40'
                          } ${
                            submitted
                              ? isAnswer
                                ? 'bg-emerald-50 border-emerald-200'
                                : selectedThis
                                  ? 'bg-red-50 border-red-200'
                                  : ''
                              : ''
                          }`}
                          disabled={submitted}
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="align-middle">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  {submitted && q.explanation ? (
                    <p className="text-sm text-muted-foreground bg-muted/50 border rounded-md p-2">
                      {q.explanation}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {!submitted ? (
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!test.questions.length}
          >
            Submit answers
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={handleRetake}>
              Retake
            </Button>
            <Button onClick={() => window.location.reload()}>New test</Button>
          </>
        )}
      </div>
    </div>
  );
}
