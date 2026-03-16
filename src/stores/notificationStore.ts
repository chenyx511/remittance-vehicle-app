import { create } from 'zustand';
import type { Notification } from '@/types';
import { notificationApi } from '@/services/api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await notificationApi.getList();
      set({ notifications: response.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      set({ unreadCount: response.data.count });
    } catch {
      // ignore
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationApi.markAsRead(id);
      const { notifications } = get();
      set({
        notifications: notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
    } catch {
      // ignore
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();
      const { notifications } = get();
      set({
        notifications: notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      });
    } catch {
      // ignore
    }
  },
}));
