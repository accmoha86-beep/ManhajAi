// store/ui-store.ts — Zustand store for UI state
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeSlug = 'default' | 'golden' | 'exams' | 'graduation' | 'dark';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  createdAt: string;
}

interface UIState {
  theme: ThemeSlug;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  currentPage: string;
  notifications: Notification[];
  isOnline: boolean;
  isMobileMenuOpen: boolean;
  forceHideSidebar: boolean;
}

interface UIActions {
  setTheme: (theme: ThemeSlug) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setCurrentPage: (page: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setOnline: (online: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setForceHideSidebar: (hide: boolean) => void;
}

const DEFAULT_NOTIFICATION_DURATION = 5000;

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set, get) => ({
      // State
      theme: 'default',
      sidebarOpen: true,
      sidebarCollapsed: false,
      currentPage: 'dashboard',
      notifications: [],
      isOnline: true,
      isMobileMenuOpen: false,
      forceHideSidebar: false,

      // Actions
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          if (theme === 'default') {
            root.removeAttribute('data-theme');
          } else {
            root.setAttribute('data-theme', theme);
          }
          document.body.classList.add('theme-transitioning');
          setTimeout(() => document.body.classList.remove('theme-transitioning'), 700);
        }
      },

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setCurrentPage: (currentPage) => set({ currentPage }),

      addNotification: (notification) => {
        const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newNotification: Notification = {
          ...notification,
          id,
          createdAt: new Date().toISOString(),
          duration: notification.duration ?? DEFAULT_NOTIFICATION_DURATION,
        };

        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        const duration = newNotification.duration ?? DEFAULT_NOTIFICATION_DURATION;
        if (duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, duration);
        }
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),

      setOnline: (isOnline) => set({ isOnline }),

      setMobileMenuOpen: (isMobileMenuOpen) => set({ isMobileMenuOpen }),

      setForceHideSidebar: (forceHideSidebar) => set({ forceHideSidebar }),
    }),
    {
      name: 'manhaj-ui',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
