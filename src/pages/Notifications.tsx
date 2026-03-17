import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Check, ArrowRight, Banknote, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notificationApi } from '@/services/api';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Notification } from '@/types';

export function Notifications() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await notificationApi.getList({
        isRead: activeTab === 'unread' ? false : undefined,
      });
      setNotifications(response.data);
    } catch {
      console.error('Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
    }
    // Navigate to related page
    if (notification.relatedType && notification.relatedId) {
      navigate(`/${notification.relatedType}s/${notification.relatedId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('notifications.title')}</h1>
          <p className="text-muted-foreground">{t('notifications.subtitleWithCount', { count: unreadCount })}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <Check className="mr-2 h-4 w-4" />
            {t('notifications.markAllAsRead')}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            {t('common.all')}
            {notifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            {t('notifications.unread')}
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            onMarkAsRead={handleMarkAsRead}
            t={t}
            locale={i18n.language}
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-6">
          <NotificationList
            notifications={unreadNotifications}
            isLoading={isLoading}
            onMarkAsRead={handleMarkAsRead}
            emptyMessage={t('notifications.noUnreadNotifications')}
            t={t}
            locale={i18n.language}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (notification: Notification) => void;
  emptyMessage?: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: string;
}

function NotificationList({
  notifications,
  isLoading,
  onMarkAsRead,
  emptyMessage,
  t,
  locale,
}: NotificationListProps) {
  const defaultEmpty = t('notifications.noNotifications');
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{emptyMessage ?? defaultEmpty}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 flex items-start gap-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                !notification.isRead ? 'bg-primary/5' : ''
              }`}
              onClick={() => onMarkAsRead(notification)}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  !notification.isRead ? 'bg-primary/10' : 'bg-muted'
                }`}
              >
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`font-medium ${!notification.isRead ? 'text-primary' : ''}`}>
                      {translateNotificationTitle(notification.type, notification.title, t)}
                    </p>
                    {notification.content && (
                      <p className="text-sm text-muted-foreground mt-1">{notification.content}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatTimeAgo(notification.createdAt, t, locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!notification.isRead && (
                      <Badge variant="destructive" className="text-xs">
                        {t('notifications.unread')}
                      </Badge>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function translateNotificationTitle(
  type: string,
  fallback: string,
  t: (key: string) => string,
): string {
  const key = `notifications.types.${type}`;
  const translated = t(key);
  return translated !== key ? translated : fallback;
}

function getNotificationIcon(type: string) {
  if (type.startsWith('REMITTANCE')) {
    return <Banknote className="h-5 w-5 text-primary" />;
  }
  if (type.startsWith('VEHICLE')) {
    return <Car className="h-5 w-5 text-blue-500" />;
  }
  return <Bell className="h-5 w-5 text-muted-foreground" />;
}

function formatTimeAgo(
  dateString: string,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string,
) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('common.justNow');
  if (minutes < 60) return t('common.minutesAgo', { count: minutes });
  if (hours < 24) return t('common.hoursAgo', { count: hours });
  if (days < 7) return t('common.daysAgo', { count: days });
  const dateLocale = locale.startsWith('ja') ? 'ja-JP' : 'zh-CN';
  return date.toLocaleDateString(dateLocale);
}
