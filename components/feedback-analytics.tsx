'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { TrendingUp, TrendingDown, Star, MessageSquare, Clock } from 'lucide-react';

interface AnalyticsData {
  messageId: string;
  model: string;
  averageQualityScore?: number;
  totalVotes: number;
  upvotes: number;
  downvotes: number;
  responseTime?: number;
  createdAt: string;
}

interface UserPreferences {
  preferenceType: string;
  preferenceValue: string;
  confidence: number;
  evidenceCount: number;
  lastUpdated: string;
}

export function FeedbackAnalytics({ userId }: { userId: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalytics();
    fetchUserPreferences();
  }, [userId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics?userId=${userId}&timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch(`/api/user-preferences?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const calculateStats = () => {
    if (analytics.length === 0) return null;

    const totalResponses = analytics.length;
    const totalVotes = analytics.reduce((sum, item) => sum + item.totalVotes, 0);
    const totalUpvotes = analytics.reduce((sum, item) => sum + item.upvotes, 0);
    const totalDownvotes = analytics.reduce((sum, item) => sum + item.downvotes, 0);
    const avgQualityScore = analytics
      .filter(item => item.averageQualityScore)
      .reduce((sum, item) => sum + (item.averageQualityScore || 0), 0) / 
      analytics.filter(item => item.averageQualityScore).length;
    const avgResponseTime = analytics
      .filter(item => item.responseTime)
      .reduce((sum, item) => sum + (item.responseTime || 0), 0) / 
      analytics.filter(item => item.responseTime).length;

    return {
      totalResponses,
      totalVotes,
      totalUpvotes,
      totalDownvotes,
      avgQualityScore: isNaN(avgQualityScore) ? 0 : avgQualityScore,
      avgResponseTime: isNaN(avgResponseTime) ? 0 : avgResponseTime,
      satisfactionRate: totalVotes > 0 ? (totalUpvotes / totalVotes) * 100 : 0,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['7d', '30d', '90d'] as const).map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(range)}
          >
            {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
          </Button>
        ))}
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.satisfactionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalUpvotes} upvotes out of {stats.totalVotes} total votes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Quality</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgQualityScore.toFixed(1)}/10</div>
              <p className="text-xs text-muted-foreground">
                Based on {analytics.filter(item => item.averageQualityScore).length} rated responses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.avgResponseTime / 1000).toFixed(1)}s</div>
              <p className="text-xs text-muted-foreground">
                Average response time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Preferences */}
      {preferences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Your AI Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {preferences.map((pref, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium capitalize">
                      {pref.preferenceType.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pref.preferenceValue}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {(pref.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {pref.evidenceCount} evidence points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Responses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Response Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-mono text-muted-foreground">
                    {item.messageId.slice(0, 8)}...
                  </div>
                  <Badge variant="outline">{item.model}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  {item.averageQualityScore && (
                    <div className="text-sm">
                      Quality: <span className="font-medium">{item.averageQualityScore.toFixed(1)}/10</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-sm">{item.upvotes}</span>
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="text-sm">{item.downvotes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
