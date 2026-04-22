'use client';

import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Globe, BookOpen, CheckSquare, Users, Award,
  Home, Shield, ChevronLeft,
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
];

const siteNav: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', label: 'لوحة الطالب', icon: Home },
  { key: 'admin', href: '/admin', label: 'لوحة الإدارة', icon: Shield, adminOnly: true },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { user } = useAuthStore();
  const pathname = usePathname();

  const isAdmin = user?.role === 'admin';
  const sidebarWidth = sidebarCollapsed ? '3.75rem' : '15rem';

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return null;
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <Link
        key={item.key}
        href={item.href}
        title={sidebarCollapsed ? item.label : undefined}
        className={active ? 'sidebar-item-active' : 'sidebar-item'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: sidebarCollapsed ? '0.7rem' : '0.65rem 0.85rem',
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
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
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
        {!sidebarCollapsed && (
          <span className="flex-1 relative">{item.label}</span>
        )}
        {!sidebarCollapsed && item.badge && (
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
        {sidebarCollapsed && item.badge && (
          <span
            className="absolute"
            style={{
              top: '0.3rem',
              left: '0.3rem',
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: '50%',
              background: 'var(--theme-primary)',
            }}
          />
        )}
      </Link>
    );
  };

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
        {/* Section: القائمة */}
        {!sidebarCollapsed && (
          <div
            className="font-cairo"
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--theme-sidebar-text-muted)',
              padding: '0.5rem 0.85rem 0.3rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            القائمة
          </div>
        )}
        <div className="flex flex-col gap-1">
          {studentNav.map(renderNavItem)}
        </div>

        <div
          className="mx-2 my-[0.6rem]"
          style={{
            height: '1px',
            background: 'var(--theme-sidebar-border)',
          }}
        />

        {/* Section: صفحات الموقع */}
        {!sidebarCollapsed && (
          <div
            className="font-cairo"
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--theme-sidebar-text-muted)',
              padding: '0.5rem 0.85rem 0.3rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
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
