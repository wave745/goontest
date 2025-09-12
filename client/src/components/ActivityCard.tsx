import { useState } from 'react';
import { Clock, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Activity } from '@shared/schema';

interface ActivityCardProps {
  activity: Activity;
  onMarkAsRead?: (activityId: string) => void;
  onViewPost?: (postId: string) => void;
  onViewUser?: (userId: string) => void;
}

export default function ActivityCard({ 
  activity, 
  onMarkAsRead, 
  onViewPost, 
  onViewUser 
}: ActivityCardProps) {
  const [isRead, setIsRead] = useState(activity.is_read);

  const handleMarkAsRead = () => {
    if (!isRead) {
      setIsRead(true);
      onMarkAsRead?.(activity.id);
    }
  };

  const getActivityIcon = () => {
    switch (activity.type) {
      case 'core_update':
        return '🚀';
      case 'user_streaming':
        return '🔴';
      case 'new_launch':
        return '🎨';
      case 'following_post':
        return '📝';
      case 'following_stream':
        return '🔴';
      case 'following_tip':
        return '💰';
      default:
        return '📢';
    }
  };

  const getActivityColor = () => {
    switch (activity.type) {
      case 'core_update':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-600';
      case 'user_streaming':
        return 'bg-red-500/10 border-red-500/20 text-red-600';
      case 'new_launch':
        return 'bg-purple-500/10 border-purple-500/20 text-purple-600';
      case 'following_post':
        return 'bg-green-500/10 border-green-500/20 text-green-600';
      case 'following_stream':
        return 'bg-orange-500/10 border-orange-500/20 text-orange-600';
      case 'following_tip':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600';
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-600';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleAction = () => {
    if (activity.post_id && onViewPost) {
      onViewPost(activity.post_id);
    } else if (activity.target_user_id && onViewUser) {
      onViewUser(activity.target_user_id);
    }
  };

  return (
    <div 
      className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
        isRead 
          ? 'bg-card border-border opacity-75' 
          : 'bg-card border-border shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${getActivityColor()}`}>
          <span className="text-lg">{getActivityIcon()}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm text-foreground truncate">
              {activity.title}
            </h3>
            {!isRead && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                New
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {activity.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatTimeAgo(activity.created_at)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {(activity.post_id || activity.target_user_id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={handleAction}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              )}
              
              {!isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={handleMarkAsRead}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Mark Read
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
