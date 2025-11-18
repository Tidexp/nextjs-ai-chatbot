'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export function VotingDemo() {
  const [showDemo, setShowDemo] = useState(false);

  if (!showDemo) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎉 Enhanced Voting System Active!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Your voting system has been upgraded! Now when you vote on AI responses, you will get a detailed feedback modal.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setShowDemo(true)} size="sm">
              Show Demo
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/analytics">View Analytics</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎯 How Enhanced Voting Works
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">1. Click Vote Button</h4>
            <p className="text-sm text-muted-foreground">
              Click 👍 or 👎 on any AI response
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Detailed Feedback Modal</h4>
            <p className="text-sm text-muted-foreground">
              Rate quality, helpfulness, accuracy, and clarity (1-10)
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. AI Learns Your Preferences</h4>
            <p className="text-sm text-muted-foreground">
              System adapts responses to your style over time
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">4. View Your Impact</h4>
            <p className="text-sm text-muted-foreground">
              Check analytics to see how your feedback improves AI
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 pt-4">
          <Badge variant="secondary">Quality Scoring</Badge>
          <Badge variant="secondary">Preference Learning</Badge>
          <Badge variant="secondary">Analytics Dashboard</Badge>
          <Badge variant="secondary">AI Improvement</Badge>
        </div>
        
        <Button variant="outline" onClick={() => setShowDemo(false)} size="sm">
          Hide Demo
        </Button>
      </CardContent>
    </Card>
  );
}
