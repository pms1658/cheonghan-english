'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import SideBar from './SideBar';
import TopBar from './TopBar';
import MobileBottomNav from './MobileBottomNav';
import CommandPalette from '@/components/common/CommandPalette';
import Logo from '@/components/common/Logo';
import { useAuth } from '@/context/AuthContext';
import DailyWrongWordsWidget from '@/components/student/DailyWrongWordsWidget';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { user } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isXl, setIsXl] = useState(false);
    const pathname = usePathname();
    const isStudent = (user as any)?.role !== 'admin' && !!(user as any)?.id;

    // Persist sidebar collapsed state across sessions
    useEffect(() => {
        const saved = localStorage.getItem('cheonghan_sidebar_collapsed');
        if (saved === 'true') setIsSidebarCollapsed(true);
    }, []);

    // Track xl breakpoint for sidebar width
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1280px)');
        setIsXl(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsXl(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Sidebar open width: lg=176px, xl=224px — matches SideBar.tsx breakpoints
    const sidebarOpenWidth = isXl ? '224px' : '176px';

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('cheonghan_sidebar_collapsed', String(next));
            return next;
        });
    };

    return (
        <div
            className="flex bg-slate-50 dark:bg-slate-950 min-h-screen font-sans selection:bg-blue-500/30 text-slate-800 dark:text-slate-100 overflow-hidden relative transition-colors"
            // Inject sidebar width as a CSS variable so ALL fixed children (headers, bottom bars)
            // can reference it via left: var(--sidebar-w) — auto-transitions on collapse/expand.
            // --sidebar-w-open is the real sidebar width (matches SideBar's lg:w-[176px] xl:w-[224px]).
            style={{
                '--sidebar-w-open': sidebarOpenWidth,
                '--sidebar-w': isSidebarCollapsed ? '0px' : sidebarOpenWidth,
            } as React.CSSProperties}
        >
            <CommandPalette />

            {/* Persistent mini-logo expand button — just the logo badge floating, no outer box */}
            {isSidebarCollapsed && (
                <button
                    onClick={toggleSidebar}
                    className="hidden lg:block fixed top-2 left-2 z-[9997] group"
                    title="사이드바 펼치기"
                >
                    <div className="w-10 h-10 bg-[#083973] rounded-xl shadow-xl ring-1 ring-white/20 overflow-hidden flex items-center justify-center p-0.5 group-hover:scale-105 group-hover:ring-white/40 transition-all duration-300 text-white">
                        <Logo className="w-full h-full" />
                    </div>
                </button>
            )}

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998] lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar — Single persistent instance, never unmounts */}
            <SideBar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                isAssignmentPage={false}
                isCollapsed={isSidebarCollapsed}
                onCollapseToggle={toggleSidebar}
            />

            {/* Main Content Area — flex-1 naturally expands when sidebar collapses */}
            <div className="flex-1 flex flex-col min-w-0 h-[100dvh] relative bg-[#0A0E27]">

                {/* Top Navigation Bar */}
                {!pathname?.includes('/assignment/') && (
                    <TopBar
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                        isSidebarCollapsed={isSidebarCollapsed}
                        onSidebarToggle={toggleSidebar}
                    />
                )}

                {/* Fixed navy strip — covers only status bar area on assignment pages.
                    Uses --sidebar-w so it stays flush with the sidebar edge. */}
                {pathname?.includes('/assignment/') && (
                    <div
                        className="fixed top-0 bg-[#0A0E27] z-[45]"
                        style={{
                            left: 'var(--sidebar-w)',
                            right: 0,
                            height: 'env(safe-area-inset-top, 0px)',
                            transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
                        }}
                    />
                )}

                {/* Page Content — On assignment pages, transform is intentionally omitted so that
                    fixed-position children (sticky bottom bars) anchor to the viewport, not this element.
                    On non-assignment pages, transform creates a containing block so overlays stay
                    within the content area rather than covering the sidebar. */}
                <main
                    role="main"
                    aria-label="페이지 콘텐츠"
                    className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 pb-20 lg:pb-0"
                    style={
                        pathname?.includes('/assignment/')
                            ? { transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)' }
                            : { transform: 'translateZ(0)', transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)' }
                    }
                >
                    {children}
                </main>

                {/* Mobile Bottom Nav */}
                {(!pathname?.includes('/assignment/')) && <MobileBottomNav />}

                {/* Daily Wrong Words Floating Widget — students only, non-assignment pages */}
                {isStudent && !pathname?.includes('/assignment/') && (
                    <DailyWrongWordsWidget
                        studentId={(user as any).id}
                        studentName={(user as any).name || ''}
                    />
                )}
            </div>
        </div>
    );
}
