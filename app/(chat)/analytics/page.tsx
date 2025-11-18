import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { FeedbackAnalytics } from '@/components/feedback-analytics';

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your AI Feedback Analytics</h1>
        <p className="text-muted-foreground">
          See how your feedback is helping improve AI responses and track your preferences over time.
        </p>
      </div>
      
      <FeedbackAnalytics userId={session.user.id} />
    </div>
  );
}
