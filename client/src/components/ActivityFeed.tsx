import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Bell, BellOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ActivityCard from './ActivityCard';
import type { Activity } from '@shared/schema';

interface ActivityFeedProps {
  userId?: string;
  limit?: number;
  showHeader?: boolean;
}

export default function ActivityFeed({ 
  userId, 
  limit = 20, 
  showHeader = true 
}: ActivityFeedProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showRead, setShowRead] = useState(false);

  const { data: activities, isLoading, error, refetch } = useQuery<Activity[]>({
    queryKey: ['/api/activities', userId, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      params.append('limit', limit.toString());
      
      const response = await fetch(`/api/activities?${params}`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ['/api/activities/unread-count', userId],
    queryFn: async () => {
      if (!userId) return { count: 0 };
      const response = await fetch(`/api/activities/unread-count?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch unread count');
      return response.json();
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await fetch(`/api/activities/${activityId}/read`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities/unread-count'] });
    },
  });

  const handleMarkAsRead = (activityId: string) => {
    markAsReadMutation.mutate(activityId);
  };

  const handleViewPost = (postId: string) => {
    setLocation(`/p/${postId}`);
  };

  const handleViewUser = (userId: string) => {
    setLocation(`/c/${userId}`);
  };

  const filteredActivities = activities?.filter(activity => 
    showRead || !activity.is_read
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
          </div>
        )}
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg border bg-card animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">Failed to load activities</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            {unreadCount && unreadCount.count > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount.count}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRead(!showRead)}
              className="text-xs"
            >
              {showRead ? (
                <>
                  <BellOff className="h-3 w-3 mr-1" />
                  Hide Read
                </>
              ) : (
                <>
                  <Bell className="h-3 w-3 mr-1" />
                  Show All
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {filteredActivities.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {showRead ? 'No activities found' : 'No new activities'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {showRead 
              ? 'Check back later for updates' 
              : 'You\'re all caught up!'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onMarkAsRead={handleMarkAsRead}
              onViewPost={handleViewPost}
              onViewUser={handleViewUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}
