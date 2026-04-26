'use client';

import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Globe, BookOpen, CheckSquare, Users, Award,
  Home, Shield, ChevronLeft, AlertTriangle, Bell, CreditCard,
  Menu, X,
} from 'lucide-react';

interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: any;
  badge?: string;
  adminOnly?: boolean;
}

const studentNav: NavItem[] = [
  { key: 'landing', href: '/', label: 'الصفحة الرئيسية', icon: Globe },
  { key: 'subjects', href: '/subjects', label: 'المواد', icon: BookOpen, badge: '3' },
  { key: 'exams', href: '/exams', label: 'الامتحانات', icon: CheckSquare },
  { key: 'leaderboard', href: '/leaderboard', label: 'المتصدرين', icon: Users },
  { key: 'certificates', href: '/certificates', label: 'الشهادات', icon: Award },
  { key: 'emergency', href: '/emergency', label: 'وضع الطوارئ 🚨', icon: AlertTriangle },
  { key: 'notifications', href: '/notifications', label: 'الإشعارات', icon: Bell },
];

const siteNav: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', label: 'لوحة الطالب', icon: Home },
  { key: 'subscribe', href: '/subscribe', label: 'الاشتراك', icon: CreditCard },
  { key: 'admin', href: '/admin', label: 'لوحة الإدارة', icon: Shield, adminOnly: true },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { user } = useAuthStore();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Hide sidebar for non-authenticated users
  if (!user) return null;

  // Hide sidebar on subjects page (full-width for content + chat)
  if (pathname.startsWith('/subjects')) return null;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return null;
    const Icon = item.icon;
    const active = isActive(item.href);
    const collapsed = isMobile ? false : sidebarCollapsed;

    return (
      <Link
        key={item.key}
        href={item.href}
        title={collapsed ? item.label : undefined}
        onClick={() => isMobile && setMobileOpen(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: collapsed ? '0.7rem' : '0.65rem 0.85rem',
          borderRadius: '0.6rem',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'Cairo', sans-serif",
          fontSize: '0.9rem',
          fontWeight: active ? 700 : 600,
          background: active
            ? 'var(--theme-sidebar-active-gradient)'
            : 'transparent',
          color: active ? '#fff' : 'var(--theme-sidebar-text)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          justifyContent: collapsed ? 'center' : 'flex-start',
          whiteSpace: 'nowrap',
          boxShadow: active ? '0 4px 15px rgba(0,0,0,0.25)' : 'none',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          textAlign: 'right',
          textDecoration: 'none',
        }}
      >
        {active && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.15), transparent)',
            }}
          />
        )}
        <Icon size={19} className="flex-shrink-0 relative" />
        {!collapsed && (
          <span className="flex-1 relative">{item.label}</span>
        )}
        {!collapsed && item.badge && (
          <span
            className="flex items-center justify-center text-white text-[0.65rem] font-extrabold relative"
            style={{
              minWidth: '1.25rem',
              height: '1.25rem',
              borderRadius: '50%',
              background: active ? 'rgba(255,255,255,0.25)' : 'var(--theme-primary)',
            }}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  // Mobile: hamburger button + overlay sidebar
  if (isMobile) {
    return (
      <>
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed z-[1002] flex items-center justify-center"
          style={{
            top: '0.85rem',
            right: '4.5rem',
            width: '2.4rem',
            height: '2.4rem',
            borderRadius: '0.5rem',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            backdropFilter: 'blur(8px)',
          }}
          aria-label="فتح القائمة"
        >
          <Menu size={20} />
        </button>

        {/* Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-[1099]"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <aside
          style={{
            position: 'fixed',
            top: 0,
            right: mobileOpen ? 0 : '-18rem',
            bottom: 0,
            width: '16rem',
            zIndex: 1100,
            background: 'var(--theme-sidebar-bg)',
            transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: mobileOpen ? '-4px 0 25px rgba(0,0,0,0.3)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            paddingTop: '1rem',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center self-start mx-3 mb-2"
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '0.5rem',
              background: 'var(--theme-sidebar-hover)',
              border: 'none',
              color: 'var(--theme-sidebar-text)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>

          <div className="flex-1 overflow-y-auto" style={{ padding: '0.5rem 0.6rem' }}>
            <div
              className="font-cairo"
              style={{
                fontSize: '0.7rem', fontWeight: 700,
                color: 'var(--theme-sidebar-text-muted)',
                padding: '0.5rem 0.85rem 0.3rem',
                letterSpacing: '0.04em',
              }}
            >
              القائمة
            </div>
            <div className="flex flex-col gap-1">
              {studentNav.map(renderNavItem)}
            </div>

            <div className="mx-2 my-[0.6rem]" style={{ height: '1px', background: 'var(--theme-sidebar-border)' }} />

            <div
              className="font-cairo"
              style={{
                fontSize: '0.7rem', fontWeight: 700,
                color: 'var(--theme-sidebar-text-muted)',
                padding: '0.5rem 0.85rem 0.3rem',
                letterSpacing: '0.04em',
              }}
            >
              صفحات الموقع
            </div>
            <div className="flex flex-col gap-1">
              {siteNav.map(renderNavItem)}
            </div>
          </div>
        </aside>
      </>
    );
  }

  // Desktop: original sidebar
  const sidebarWidth = sidebarCollapsed ? '3.75rem' : '15rem';

  return (
    <aside
      style={{
        position: 'fixed',
        top: '4rem',
        right: 0,
        bottom: 0,
        width: sidebarWidth,
        zIndex: 1000,
        background: 'var(--theme-sidebar-bg)',
        borderLeft: '1px solid var(--theme-sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}
    >
      {/* Collapse toggle */}
      <button
        onClick={toggleSidebarCollapsed}
        title={sidebarCollapsed ? 'توسيع' : 'تصغير'}
        className="flex items-center justify-center h-10 border-none cursor-pointer"
        style={{
          background: 'transparent',
          color: 'var(--theme-sidebar-text)',
          borderBottom: '1px solid var(--theme-sidebar-border)',
        }}
      >
        <ChevronLeft
          size={18}
          style={{
            transform: sidebarCollapsed ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.3s ease',
          }}
        />
      </button>

      <div className="flex-1 overflow-y-auto" style={{ padding: '0.5rem 0.6rem' }}>
        {!sidebarCollapsed && (
          <div
            className="font-cairo"
            style={{
              fontSize: '0.7rem', fontWeight: 700,
              color: 'var(--theme-sidebar-text-muted)',
              padding: '0.5rem 0.85rem 0.3rem',
              letterSpacing: '0.04em',
            }}
          >
            القائمة
          </div>
        )}
        <div className="flex flex-col gap-1">
          {studentNav.map(renderNavItem)}
        </div>

        <div className="mx-2 my-[0.6rem]" style={{ height: '1px', background: 'var(--theme-sidebar-border)' }} />

        {!sidebarCollapsed && (
          <div
            className="font-cairo"
            style={{
              fontSize: '0.7rem', fontWeight: 700,
              color: 'var(--theme-sidebar-text-muted)',
              padding: '0.5rem 0.85rem 0.3rem',
              letterSpacing: '0.04em',
            }}
          >
            صفحات الموقع
          </div>
        )}
        <div className="flex flex-col gap-1">
          {siteNav.map(renderNavItem)}
        </div>
      </div>
    </aside>
  );
}
