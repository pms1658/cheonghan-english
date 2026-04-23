'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Class } from '@/services/db';

// Recursive Folder Logic
export type ClassTree = {
    name: string;
    children: Record<string, ClassTree>;
    classes: Class[];
};

export const buildClassTree = (classes: Class[]) => {
    const tree: Record<string, ClassTree> = {};

    classes.forEach(cls => {
        const parts = cls.name.split(' - ');

        // Handle Root Part
        const rootPart = parts[0];
        if (!tree[rootPart]) {
            tree[rootPart] = { name: rootPart, children: {}, classes: [] };
        }
        let currentNode = tree[rootPart];

        // If simple "X", just push to root node
        if (parts.length === 1) {
            currentNode.classes.push(cls);
            return;
        }

        // Iterate middle parts (excluding first and last)
        // "A - B - C" -> parts[1] is B. 
        // We traverse A -> B. Then add C to B.classes.
        for (let i = 1; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!currentNode.children[part]) {
                currentNode.children[part] = { name: part, children: {}, classes: [] };
            }
            currentNode = currentNode.children[part];
        }

        // Add to the final node's classes
        // The last part is the "Class Name" relative to the folder structure
        currentNode.classes.push(cls);
    });
    return tree;
};

// Recursive Folder Component
export const ClassFolderItem = ({ node, onClassClick, selectedClass, level = 0 }: { node: ClassTree; onClassClick: (c: Class) => void; selectedClass: Class | null; level?: number }) => {
    const hasChildren = Object.keys(node.children).length > 0;
    const hasClasses = node.classes.length > 0;
    const isEmpty = !hasChildren && !hasClasses;

    // Identity Check: If it's a single class matching the folder name (Root Leaf case)
    // "X" -> Node X -> classes=[X].
    const isIdentityWrapper = !hasChildren && node.classes.length === 1 && node.classes[0].name === node.name;
    const directClass = isIdentityWrapper ? node.classes[0] : null;

    const [isHovered, setIsHovered] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const folderRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (folderRef.current) {
            const rect = folderRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom - 5,
                left: rect.left + (level > 0 ? 15 : 0) // Step right for sub-menus to ease navigation
            });
        }
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (directClass) {
        // Render as a direct class item (Leaf Root)
        const isActive = selectedClass?.id === directClass.id;
        return (
            <div
                onClick={() => onClassClick(directClass)}
                className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors mb-1
                    ${isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}
                `}
            >
                <span className="text-sm font-bold">{node.name}</span>
            </div>
        );
    }

    return (
        <div
            ref={folderRef}
            className="relative group mb-1"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Folder Label */}
            <div className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors
                ${isHovered ? 'bg-slate-100' : ''}
                ${level > 0 ? 'bg-white' : ''}
            `}>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700">{node.name}</span>
                    {(hasChildren || hasClasses) && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded-full">
                            {Object.keys(node.children).length + node.classes.length}
                        </span>
                    )}
                </div>
                {/* Chevron Removed */}
            </div>

            {/* Floating Content (Portal) */}
            {mounted && isHovered && (hasChildren || hasClasses) && createPortal(
                <div
                    className="fixed bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-[9999] animate-fadeIn w-64"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {/* 1. Classes in this folder */}
                    {node.classes.length > 0 && (
                        <div className="mb-2 space-y-1">
                            {node.classes.map(cls => (
                                <div
                                    key={cls.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClassClick(cls);
                                    }}
                                    className={`p-2 rounded-lg cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-all
                                        ${selectedClass?.id === cls.id ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' : 'text-slate-600'}
                                    `}
                                >
                                    <span className="text-sm font-bold text-ellipsis overflow-hidden whitespace-nowrap block max-w-[180px]">
                                        {cls.name.split(' - ').pop()}
                                    </span>
                                    {selectedClass?.id === cls.id && <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 2. Sub-folders */}
                    {Object.values(node.children).map(childNode => (
                        <ClassFolderItem
                            key={childNode.name}
                            node={childNode}
                            level={level + 1}
                            onClassClick={onClassClick}
                            selectedClass={selectedClass}
                        />
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};
