'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';

interface HybridNodeProps {
    node: any; // TreeItem type
    depth: number;
    isOpen: boolean;
    onToggle: (e: React.MouseEvent) => void;
    onAddChild?: (parentId: string) => void; // Admin only
    onSettingsClick?: (node: any) => void; // Admin only
    onNavigate?: () => void;
    isAdmin: boolean;
    onNodeContextMenu?: (node: any, position: { x: number; y: number }) => void;
}

export default function HybridNode({ node, depth, isOpen, onToggle, onAddChild, onSettingsClick, onNavigate, isAdmin, onNodeContextMenu }: HybridNodeProps) {
    const router = useRouter();
    const params = useParams();
    const activeId = params?.classId as string;

    // Determine active state: Is this exact node the current room?
    // We assume node.id or node.classes[0].id corresponds to the room ID if it acts as a room.
    // However, in the Hybrid model, the "Folder" itself is a "Room". 
    // The current data structure separates "children" (folders) and "classes" (rooms).
    // To achieve true Hybrid, every Folder *is* a Class/Room.
    // For now, checks if any of its direct children classes match activeId for "Parent Active" state,
    // OR if this node ITSELF is being viewed (if we add ID to folder nodes).

    // In strict Hybrid: Text Click -> Go to Room (Show Assignments).
    // Chevron Click -> Toggle Children.

    // For this prototype, we'll map the node's "primary class ID" if available. 
    // If it's a folder-only node without a direct ID, text click might just toggle?
    // User Requirement: "All menus are Hybrid... clickable 'Assignment Room' + 'Folder'".
    // This implies even top-level folders correlate to a Class ID where assignments live.
    // We will assume `node.id` exists or we find the "linked class" for this folder.
    // Fallback: If no ID, Text click toggles.

    // Visuals
    const isActive = activeId === node.id; // Needs node.id to be passed from Tree builder
    const hasChildren = node.children.length > 0 || node.classes.length > 0;

    // Dynamic Icon — Folders: book open/closed, Leaf: academic cap
    const Icon = hasChildren
        ? (isOpen
            ? <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            : <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>)
        : <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>; // Document icon for leaf rooms

    const nodeRef = React.useRef<HTMLDivElement>(null);
    const [labelPos, setLabelPos] = useState({ top: 0, left: 0 });
    const [isHovered, setIsHovered] = useState(false);

    // Update position logic
    const updatePosition = () => {
        if (nodeRef.current) {
            const rect = nodeRef.current.getBoundingClientRect();
            setLabelPos({
                top: rect.top + rect.height / 2,
                left: rect.right + 10 // 10px spacing
            });
        }
    };

    useEffect(() => {
        updatePosition();
        // Capture scroll events to update position while scrolling sidebar
        document.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            document.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, []);

    // ... handleTextClick ... (keep existing)

    const handleTextClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        // [Fix] Folders should just toggle, not navigate
        // Check if node type is folder OR if it lacks an explicit ID (though ID usually exists)
        if (node.type === 'folder') {
            onToggle(e);
            return;
        }

        if (node.id) {
            if (onNavigate) onNavigate(); // Trigger navigation callback
            router.push(`/class/${node.id}`);
        } else {
            // If no ID (just a organizational folder), toggle instead
            onToggle(e);
        }
    };

    const handleChevronClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle(e);
    };

    const handleAddClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onAddChild) onAddChild(node.id || node.name);
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        if (!isAdmin || !onNodeContextMenu) return;
        e.preventDefault();
        e.stopPropagation();
        onNodeContextMenu(node, { x: e.clientX, y: e.clientY });
    };

    // Long press for mobile context menu
    const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!isAdmin || !onNodeContextMenu) return;
        const touch = e.touches[0];
        const pos = { x: touch.clientX, y: touch.clientY };
        longPressTimer.current = setTimeout(() => {
            e.preventDefault();
            onNodeContextMenu(node, pos);
        }, 500);
    };
    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const paddingLeft = depth * 8 + 12;

    return (
        <>
            <div
                ref={nodeRef}
                className={`
                    group relative flex items-center justify-between px-3 py-3 rounded-2xl cursor-pointer transition-all duration-300 ease-spring
                    ${isAdmin ? 'hover:pr-10' : ''} /* Space for admin button */
                    ${isActive
                        ? 'bg-white/10 text-white font-bold shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-white/5 hover:translate-x-1'}
                `}
                style={{ paddingLeft: `${paddingLeft}px` }}
                onClick={handleTextClick}
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
            >
                <div className="flex items-center gap-3 overflow-custom min-w-0 flex-1">
                    {/* Chevron: Only if children exist */}
                    {hasChildren ? (
                        <div
                            onClick={handleChevronClick}
                            className={`p-0.5 rounded-md transition-colors hover:bg-white/10 ${isActive ? 'text-white' : 'text-white/40'}`}
                        >
                            <svg className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </div>
                    ) : (
                        <div className="w-4 flex-shrink-0" /> // Spacer
                    )}

                    {/* Icon */}
                    <div className="shrink-0 flex items-center justify-center">
                        {/* Dynamic Icon Color Override for Active State if needed, defaulting to inherit or explicit */}
                        {React.cloneElement(Icon as React.ReactElement, { className: `w-[18px] h-[18px] ${isActive ? 'text-blue-400' : 'text-white/40 group-hover:text-blue-400'}` })}
                    </div>

                    {/* Text */}
                    <span className={`text-[13px] truncate flex-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                        {node.name}
                    </span>

                    {/* Active Indicator (Blinking Blue Dot) */}
                    {isActive && (
                        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0 ml-2"></div>
                    )}
                </div>

                {/* Admin Controls (Hover) */}
                {isAdmin && (
                    <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 z-20">
                        {/* Edit/Settings (Gear) */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onSettingsClick) onSettingsClick(node);
                            }}
                            className="p-1 text-slate-400 hover:text-[#0A0E27] hover:bg-slate-200 rounded-md transition-colors"
                            title="설정"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </button>
                        {/* Add Child (+) */}
                        <button
                            onClick={handleAddClick}
                            className="p-1 text-slate-400 hover:text-white hover:bg-blue-600 rounded-md transition-colors"
                            title="하위 항목 생성"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
