'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import SideBar from './SideBar';
import TopBar from './TopBar';
import MobileBottomNav from './MobileBottomNav';
import CommandPalette from '@/components/common/CommandPalette';
import Logo from '@/components/common/Logo';

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

                {/* Fixed navy strip — covers only status bar area on assignment pages */}
                {pathname?.includes('/assignment/') && (
                    <div className="fixed top-0 left-0 right-0 bg-[#0A0E27] z-[45]"
                         style={{ height: 'env(safe-area-inset-top, 0px)' }} />
                )}

                {/* Page Content — transform creates a new containing block for fixed children,
                    so assignment fixed overlays stay within this area and don't cover the sidebar */}
                <main
                    role="main"
                    aria-label="페이지 콘텐츠"
                    className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 pb-20 lg:pb-0"
                    style={{ transform: 'translateZ(0)' }}
                >
                    <AnimatePresence mode="sync" initial={false}>
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            style={{ minHeight: '100%' }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* Mobile Bottom Nav */}
                {(!pathname?.includes('/assignment/')) && <MobileBottomNav />}
            </div>
        </div>
    );
}
