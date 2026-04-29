'use client';

import React, { useState } from 'react';
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
    const pathname = usePathname();

    return (
        <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen font-sans selection:bg-blue-500/30 text-slate-800 dark:text-slate-100 overflow-hidden relative transition-colors">
            <CommandPalette />

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
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-[100dvh] transition-all duration-300 relative bg-slate-50 dark:bg-slate-950">

                {/* Top Navigation Bar — Hidden on assignment pages (assignments have own headers) */}
                {!pathname?.includes('/assignment/') && (
                    <TopBar
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                    />
                )}

                {/* Fixed navy strip — covers only status bar area on assignment pages */}
                {pathname?.includes('/assignment/') && (
                    <div className="fixed top-0 left-0 right-0 bg-[#0A0E27] z-[45]"
                         style={{ height: 'env(safe-area-inset-top, 0px)' }} />
                )}

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 pb-20 lg:pb-0">
                    {children}
                </main>

                {/* Mobile Bottom Nav — Hidden on assignment pages */}
                {(!pathname?.includes('/assignment/')) && <MobileBottomNav />}
            </div>
        </div>
    );
}

