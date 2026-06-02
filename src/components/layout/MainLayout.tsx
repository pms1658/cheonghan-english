'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import SideBar from './SideBar';
import TopBar from './TopBar';
import MobileBottomNav from './MobileBottomNav';
import CommandPalette from '@/components/common/CommandPalette';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const pathname = usePathname();

    // Persist sidebar collapsed state across sessions
    useEffect(() => {
        const saved = localStorage.getItem('cheonghan_sidebar_collapsed');
        if (saved === 'true') setIsSidebarCollapsed(true);
    }, []);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('cheonghan_sidebar_collapsed', String(next));
            return next;
        });
    };

    return (
        <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen font-sans selection:bg-blue-500/30 text-slate-800 dark:text-slate-100 overflow-hidden relative transition-colors">
            <CommandPalette />

            {/* Persistent sidebar expand button — fixed, visible on ALL pages when collapsed, desktop only */}
            {isSidebarCollapsed && (
                <button
                    onClick={toggleSidebar}
                    className="hidden lg:flex fixed top-3 left-3 z-[9997] w-8 h-8 items-center justify-center rounded-lg bg-[#0A0E27]/90 border border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-[#0A0E27] backdrop-blur-md transition-all duration-200 shadow-lg"
                    title="사이드바 펼치기"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M3 12h17" />
                    </svg>
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
            <div className="flex-1 flex flex-col min-w-0 h-[100dvh] relative bg-slate-50 dark:bg-slate-950">

                {/* Top Navigation Bar */}
                {!pathname?.includes('/assignment/') && (
                    <TopBar
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                        isSidebarCollapsed={isSidebarCollapsed}
                        onSidebarToggle={toggleSidebar}
                    />
                )}

                {/* Fixed navy strip — covers only status bar area on assignment pages */}
                {pathname?.includes('/assignment/') && (
                    <div className="fixed top-0 left-0 right-0 bg-[#0A0E27] z-[45]"
                         style={{ height: 'env(safe-area-inset-top, 0px)' }} />
                )}

                {/* Page Content */}
                <main role="main" aria-label="페이지 콘텐츠" className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 pb-20 lg:pb-0">
                    {children}
                </main>

                {/* Mobile Bottom Nav */}
                {(!pathname?.includes('/assignment/')) && <MobileBottomNav />}
            </div>
        </div>
    );
}
