'use client';

import { useAuthStore } from '@/store/auth-store';
import { useUIStore } from '@/store/ui-store';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Settings, LogIn, UserPlus, LogOut } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function TopBar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const topBarBtnClass = (isActive: boolean) =>
    `flex items-center gap-[0.45rem] px-[0.9rem] py-[0.4rem] rounded-lg border cursor-pointer font-cairo text-[0.78rem] font-bold text-white whitespace-nowrap transition-all duration-250 backdrop-blur-[8px] ${
      isActive
        ? 'border-white/60 bg-white/25 shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
        : 'border-white/20 bg-white/10 shadow-none'
    } hover:bg-white/25 hover:border-white/40`;

  const mobileBtnClass = (isActive: boolean) =>
    `flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all ${
      isActive
        ? 'border-white/60 bg-white/25'
        : 'border-white/20 bg-white/10'
    }`;

  return (
    <header
      className="fixed top-0 left-0 right-0 h-16 z-[1001] flex items-center justify-between px-3 md:px-5"
      style={{
        background: 'var(--theme-topbar-gradient)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      {/* Brand Logo - RIGHT side (RTL) — Theme filter changes logo appearance */}
      <Link href="/" className="flex items-center gap-2 select-none group">
        <div className="theme-logo flex items-center" style={{ height: '3.4rem' }}>
          <img
            src="/logo-horizontal.png"
            alt="منهج AI"
            className="transition-transform duration-300 group-hover:scale-105"
            style={{
              height: isMobile ? '2rem' : '2.4rem',
              width: 'auto',
              filter: 'var(--theme-logo-filter, brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.3)))',
            }}
          />
        </div>
      </Link>

      {/* Action buttons - LEFT side (RTL) */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {isAuthenticated && (
          <NotificationBell />
        )}

        {/* Settings */}
        {isMobile ? (
          <Link href="/settings" className={mobileBtnClass(pathname === '/settings')}>
            <Settings size={16} className="text-white" />
          </Link>
        ) : (
          <Link href="/settings" className={topBarBtnClass(pathname === '/settings')}>
            <Settings size={15} />
            <span>الإعدادات</span>
          </Link>
        )}

        {!isAuthenticated ? (
          <>
            {isMobile ? (
              <>
                <Link href="/login" className={mobileBtnClass(pathname === '/login')}>
                  <LogIn size={16} className="text-white" />
                </Link>
                <Link href="/register" className={mobileBtnClass(pathname === '/register')}>
                  <UserPlus size={16} className="text-white" />
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className={topBarBtnClass(pathname === '/login')}>
                  <LogIn size={15} />
                  <span>تسجيل الدخول</span>
                </Link>
                <Link href="/register" className={topBarBtnClass(pathname === '/register')}>
                  <UserPlus size={15} />
                  <span>إنشاء حساب</span>
                </Link>
              </>
            )}
          </>
        ) : (
          <>
            {!isMobile && (
              <>
                <div
                  className="flex items-center gap-[0.45rem] px-4 py-[0.4rem] rounded-lg text-[0.78rem] font-bold text-white whitespace-nowrap"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                  }}
                >
                  <span>أهلاً {user?.fullName} 👋</span>
                </div>
                <div className="w-px h-6 bg-white/30 mx-[0.15rem]" />
              </>
            )}

            {/* Logout */}
            {isMobile ? (
              <button
                onClick={() => { logout(); router.push('/'); }}
                className={mobileBtnClass(false)}
              >
                <LogOut size={16} className="text-white" />
              </button>
            ) : (
              <button
                onClick={() => { logout(); router.push('/'); }}
                className={topBarBtnClass(false)}
              >
                <LogOut size={15} />
                <span>خروج</span>
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
