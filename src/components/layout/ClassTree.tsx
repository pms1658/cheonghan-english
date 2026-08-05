'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { dbService, Class, ClassFolder } from '@/services/db';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import HybridNode from './HybridNode';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    MouseSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

// --- Types ---
interface TreeNode {
    id: string;
    originalId: string; // Real DB ID
    name: string;
    type: 'folder' | 'class';
    children: TreeNode[];
    parentId?: string | null;
}

// Ensure unique IDs for sortable
function SortableNode({ id, children }: { id: string, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 'auto', position: isDragging ? 'relative' as const : undefined };
    return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>{children}</div>;
}

export default function ClassTree({ onNavigate }: { onNavigate?: () => void }) {
    const router = useRouter();
    const params = useParams();
    const [nodes, setNodes] = useState<TreeNode[]>([]); // Root nodes
    const [openNodes, setOpenNodes] = useState<Set<string>>(new Set());
    const { user } = useAuth();
    const { tenantId } = useTenant();
    const isAdmin = (user as any)?.role === 'admin';

    // Creation State
    const [isCreating, setIsCreating] = useState<{ parentId: string | null; parentName: string } | null>(null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemType, setNewItemType] = useState<'class' | 'folder'>('class');

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ node: any; x: number; y: number } | null>(null);
    const [clipboard, setClipboard] = useState<{ id: string; type: 'class' | 'folder'; name: string } | null>(null);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState<{ id: string; type: 'class' | 'folder'; name: string } | null>(null);
    const [isOperating, setIsOperating] = useState(false);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Drag State
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

    const sensors = useSensors(
        // MouseSensor only: touch drag removed to prevent scroll conflicts on mobile.
        // Mobile users can move items via the settings modal's 이동 button.
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Close context menu on outside click
    useEffect(() => {
        if (!contextMenu) return;
        const handler = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [contextMenu]);

    // --- Data Fetching & Tree Building ---
    const loadData = async () => {
        if (!user) return;
        try {
            const [classesData, foldersData] = await Promise.all([
                dbService.getClasses(),
                dbService.getClassFolders()
            ]);

            // Filter for students
            let relevantClasses = classesData;
            let relevantFolders = foldersData;

            if (!isAdmin) {
                const studentClassIds = (user as any).classIds || [];
                relevantClasses = classesData.filter(c => studentClassIds.includes(c.id));
            }

            if (!isAdmin) {
                // Student View: Flat List of Assigned Classes Only
                const flatNodes: TreeNode[] = relevantClasses.map(c => ({
                    id: c.id,
                    originalId: c.id,
                    name: c.studentName || c.name,
                    type: 'class',
                    children: [],
                    parentId: null
                }));
                // Sort by name
                flatNodes.sort((a, b) => a.name.localeCompare(b.name));
                setNodes(flatNodes);
            } else {
                // Admin View: Full Tree (Folders > Classes)
                const tree = buildTree(relevantClasses, relevantFolders);
                setNodes(tree);
            }

        } catch (error) {
            console.error("Failed to fetch sidebar data:", error);
        }
    };

    useEffect(() => {
        loadData();
    }, [user, isAdmin, tenantId]);

    // Listen for class-updated events from other components (e.g., ClassRoom page)
    useEffect(() => {
        const handleClassUpdated = () => loadData();
        window.addEventListener('class-updated', handleClassUpdated);
        return () => window.removeEventListener('class-updated', handleClassUpdated);
    }, []);

    const buildTree = (classes: Class[], folders: ClassFolder[]): TreeNode[] => {
        const nodeMap = new Map<string, TreeNode>();

        // 1. Create Nodes for Folders
        folders.forEach(f => {
            nodeMap.set(f.id, {
                id: f.id,
                originalId: f.id,
                name: f.name,
                type: 'folder',
                children: [],
                parentId: f.parentId || null
            });
        });

        // 2. Create Nodes for Classes
        classes.forEach(c => {
            // Note: Classes are leaves in this structure, but displayed consistently
            nodeMap.set(c.id, {
                id: c.id,
                originalId: c.id,
                name: c.name,
                type: 'class',
                children: [],
                parentId: c.folderId || null
            });
        });

        const rootNodes: TreeNode[] = [];

        // 3. Assemble Tree
        nodeMap.forEach(node => {
            if (node.parentId && nodeMap.has(node.parentId)) {
                const parent = nodeMap.get(node.parentId)!;
                parent.children.push(node);
            } else {
                rootNodes.push(node);
            }
        });

        // 4. Sort: Folders first, then Classes
        const sortNodes = (nodes: TreeNode[]) => {
            nodes.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
            nodes.forEach(n => sortNodes(n.children));
        };
        sortNodes(rootNodes);

        return rootNodes;
    };

    // --- Interaction Handlers ---

    const toggleNode = (id: string) => {
        const newOpen = new Set(openNodes);
        if (newOpen.has(id)) newOpen.delete(id);
        else newOpen.add(id);
        setOpenNodes(newOpen);
    };

    // --- Drag Handlers ---
    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (!over) {
            setDragOverFolderId(null);
            return;
        }
        // Find if the over target is a folder
        const overNode = findNodeById(nodes, over.id as string);
        if (overNode && overNode.type === 'folder' && overNode.id !== activeDragId) {
            setDragOverFolderId(overNode.id);
        } else {
            setDragOverFolderId(null);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        setDragOverFolderId(null);

        if (!over || active.id === over.id) return;

        const draggedNode = findNodeById(nodes, active.id as string);
        const overNode = findNodeById(nodes, over.id as string);

        if (!draggedNode) return;

        // Case 1: Dropped onto a folder → MOVE into that folder
        if (overNode && overNode.type === 'folder') {
            // Prevent circular: can't drop a folder into itself or its own descendants
            if (draggedNode.type === 'folder' && isDescendant(draggedNode, overNode.originalId)) {
                toast.error('자기 자신의 하위 폴더로는 이동할 수 없습니다.');
                return;
            }
            try {
                if (draggedNode.type === 'class') {
                    await dbService.updateClass(draggedNode.originalId, { folderId: overNode.originalId });
                } else {
                    await dbService.updateClassFolder(draggedNode.originalId, draggedNode.name, overNode.originalId);
                }
                toast.success(`'${draggedNode.name}'을(를) '${overNode.name}'으로 이동했습니다.`);
                await loadData();
                // Auto-open the target folder
                setOpenNodes(prev => new Set(prev).add(overNode.id));
            } catch (e) {
                toast.error('이동 실패');
            }
            return;
        }

        // Case 2: Same-level reorder (original behavior)
        setNodes((prev) => {
            const oldIndex = prev.findIndex(c => c.id === active.id);
            const newIndex = prev.findIndex(c => c.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                return arrayMove(prev, oldIndex, newIndex);
            }
            return prev;
        });
    };

    const handleDragCancel = () => {
        setActiveDragId(null);
        setDragOverFolderId(null);
    };

    // Helper: find node by ID in tree
    const findNodeById = (nodeList: TreeNode[], id: string): TreeNode | null => {
        for (const node of nodeList) {
            if (node.id === id) return node;
            const found = findNodeById(node.children, id);
            if (found) return found;
        }
        return null;
    };

    // Helper: check if targetId is a descendant of node
    const isDescendant = (node: TreeNode, targetId: string): boolean => {
        if (node.originalId === targetId) return true;
        return node.children.some(child => isDescendant(child, targetId));
    };

    // --- Context Menu Handlers ---
    const handleNodeContextMenu = useCallback((node: any, position: { x: number; y: number }) => {
        setContextMenu({ node, x: position.x, y: position.y });
    }, []);

    const handleCopy = () => {
        if (!contextMenu) return;
        const { node } = contextMenu;
        setClipboard({ id: node.id, type: node.type, name: node.name });
        toast.success(`'${node.name}' 복사됨 (붙여넣기 할 폴더에서 우클릭)`);
        setContextMenu(null);
    };

    const handlePaste = async (targetFolderId: string | null) => {
        if (!clipboard) return;
        if (clipboard.type !== 'class') {
            toast.error('현재 과제방만 복사/붙여넣기가 가능합니다.');
            return;
        }
        setIsOperating(true);
        try {
            const result = await dbService.duplicateClass(clipboard.id, targetFolderId);
            toast.success(`'${result.name}' 생성 완료 (과제 ${result.assignmentCount}개 복사)`);
            await loadData();
            if (targetFolderId) {
                setOpenNodes(prev => new Set(prev).add(targetFolderId));
            }
        } catch (e) {
            toast.error('복사 실패');
        } finally {
            setIsOperating(false);
            setContextMenu(null);
        }
    };

    const handleMoveToFolder = async (targetFolderId: string | null) => {
        if (!isMoveModalOpen) return;
        setIsOperating(true);
        try {
            if (isMoveModalOpen.type === 'class') {
                await dbService.updateClass(isMoveModalOpen.id, { folderId: targetFolderId || undefined });
            } else {
                // Find current name for the folder
                const folderNode = findNodeById(nodes, isMoveModalOpen.id);
                const name = folderNode?.name || isMoveModalOpen.name;
                await dbService.updateClassFolder(isMoveModalOpen.id, name, targetFolderId);
            }
            toast.success(`'${isMoveModalOpen.name}' 이동 완료`);
            await loadData();
            if (targetFolderId) {
                setOpenNodes(prev => new Set(prev).add(targetFolderId));
            }
        } catch (e) {
            toast.error('이동 실패');
        } finally {
            setIsOperating(false);
            setIsMoveModalOpen(null);
        }
    };

    const handleMoveToRoot = async () => {
        await handleMoveToFolder(null);
    };

    // Add Logic
    const openCreateModal = (parentId: string | null, parentName: string = '최상위') => {
        setIsCreating({ parentId, parentName });
        setNewItemName('');
        setNewItemType('class'); // Default
    };

    const handleCreateSubmit = async () => {
        if (!isCreating || !newItemName.trim()) return;

        const targetParentId = isCreating.parentId;

        try {
            if (newItemType === 'folder') {
                const realParentId = (targetParentId && targetParentId.startsWith('virtual-')) ? undefined : (targetParentId || undefined);
                await dbService.addClassFolder(newItemName, realParentId);
            } else {
                // Create Class
                const newClass = await dbService.addClass(newItemName);
                // If there's a parentId and it's not a virtual ID, update the class with the folderId
                if (targetParentId && !targetParentId.startsWith('virtual-')) {
                    await dbService.updateClass(newClass.id, { folderId: targetParentId });
                }
            }

            // Refresh
            await loadData();
            setIsCreating(null);

            // Auto open parent if exists
            if (isCreating.parentId) {
                setOpenNodes(prev => new Set(prev).add(isCreating.parentId!));
            }

        } catch (e) {
            console.error(e);
            toast.error('생성 실패');
        }
    };

    // --- Edit / Settings Logic ---
    const [isEditing, setIsEditing] = useState<{ id: string; name: string; type: 'class' | 'folder'; originalId: string } | null>(null);
    const [editName, setEditName] = useState('');

    const handleSettingsClick = (node: any) => {
        setIsEditing({
            id: node.id,
            name: node.name,
            type: node.type,
            originalId: node.originalId
        });
        setEditName(node.name);
    };

    const handleRenameSubmit = async () => {
        if (!isEditing || !editName.trim()) return;
        try {
            if (isEditing.type === 'folder') {
                await dbService.updateClassFolder(isEditing.originalId, editName);
            } else {
                await dbService.updateClass(isEditing.originalId, { name: editName });
            }
            await loadData();
            setIsEditing(null);
            toast.success('이름이 수정되었습니다.');
            // Notify other components (e.g., ClassRoom page) about the update
            window.dispatchEvent(new CustomEvent('class-updated', { detail: { id: isEditing.originalId, name: editName } }));
        } catch (e) {
            console.error(e);
            toast.error('이름 수정 실패');
        }
    };

    const handleDeleteSubmit = async () => {
        if (!isEditing) return;
        if (!confirm('정말 삭제하시겠습니까? 하위 항목도 모두 삭제될 수 있습니다.')) return;

        try {
            if (isEditing.type === 'folder') {
                await dbService.deleteClassFolder(isEditing.originalId);
            } else {
                await dbService.deleteClass(isEditing.originalId);
            }
            await loadData();
            setIsEditing(null);
        } catch (e) {
            console.error(e);
            toast.error('삭제 실패');
        }
    };

    // --- Recursive Render ---
    const renderNode = (node: TreeNode, depth = 0, isRoot = false) => {
        const isOpen = openNodes.has(node.id);

        // Convert to HybridNode props
        const hybridNodeData = {
            id: node.originalId,
            name: node.name,
            children: node.children,
            classes: [], // Legacy compat
            type: node.type
        };

        const content = (
            <div key={node.id} className="relative">
                <HybridNode
                    node={hybridNodeData}
                    depth={depth}
                    isOpen={isOpen}
                    onToggle={(e) => toggleNode(node.id)}
                    isAdmin={isAdmin}
                    onAddChild={(parentId) => openCreateModal(node.originalId, node.name)}
                    onSettingsClick={(n) => handleSettingsClick(node)}
                    onNavigate={onNavigate}
                    onNodeContextMenu={handleNodeContextMenu}
                />
                {/* Drop target highlight */}
                {dragOverFolderId === node.id && node.type === 'folder' && (
                    <div className="absolute inset-0 rounded-2xl border-2 border-blue-400 bg-blue-400/10 pointer-events-none z-10 animate-pulse" />
                )}

                {/* Children — Animated Expand/Collapse */}
                {node.children.length > 0 && (
                    <div
                        className="border-l border-white/5 ml-2 overflow-hidden transition-all duration-300 ease-in-out"
                        style={{
                            display: 'grid',
                            gridTemplateRows: isOpen ? '1fr' : '0fr',
                        }}
                    >
                        <div className="min-h-0">
                            <div className={`mt-1 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                                {node.children.map((child, i) => (
                                    <div
                                        key={child.id}
                                        className="transition-all duration-300 ease-out"
                                        style={{
                                            transitionDelay: isOpen ? `${i * 40}ms` : '0ms',
                                            opacity: isOpen ? 1 : 0,
                                            transform: isOpen ? 'translateY(0)' : 'translateY(-8px)',
                                        }}
                                    >
                                        {renderNode(child, depth + 1)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );

        if (isRoot) {
            return <SortableNode key={node.id} id={node.id}>{content}</SortableNode>;
        }
        return content;
    };

    return (
        <div className="pb-10 select-none relative">
            {/* Header with Root Action */}
            <div className="flex items-center justify-between px-4 mb-2 group">
                <div className="text-[10px] uppercase tracking-wider font-bold text-white/40">ASSIGNMENT ROOMS</div>
                {isAdmin && (
                    <button
                        onClick={() => openCreateModal(null, 'Assignment Rooms')}
                        className="text-slate-500 hover:text-white hover:bg-blue-600 p-1 rounded transition-colors opacity-100"
                        title="최상위 항목 생성"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    </button>
                )}
            </div>

            {/* Tree Content */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <SortableContext items={nodes.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    {nodes.map(node => renderNode(node, 0, true))}
                </SortableContext>
                <DragOverlay>
                    {activeDragId ? (
                        <div className="bg-white/10 backdrop-blur-sm text-white text-sm font-bold px-4 py-2 rounded-xl border border-blue-400/50 shadow-lg">
                            {findNodeById(nodes, activeDragId)?.name || '이동 중...'}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Clipboard Indicator */}
            {clipboard && isAdmin && (
                <div className="mx-3 mt-3 px-3 py-2 bg-blue-500/10 border border-blue-400/20 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-blue-400 text-xs">📋</span>
                        <span className="text-[11px] text-blue-300 font-medium truncate">{clipboard.name}</span>
                    </div>
                    <button
                        onClick={() => setClipboard(null)}
                        className="text-[10px] text-white/40 hover:text-red-400 transition-colors flex-shrink-0 ml-2"
                    >✕</button>
                </div>
            )}

            {/* Creation Inline Card */}
            {isCreating && (
                <div className="mx-2 mt-2 mb-1 bg-white/[0.06] border border-white/10 rounded-xl p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">새 항목 생성</span>
                        <button
                            onClick={() => setIsCreating(null)}
                            className="w-5 h-5 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/10 transition-all"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Type Toggle */}
                    <div className="flex bg-white/5 p-0.5 rounded-lg mb-2.5">
                        <button
                            onClick={() => setNewItemType('class')}
                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${newItemType === 'class' ? 'bg-blue-600 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                        >
                            과제방
                        </button>
                        <button
                            onClick={() => setNewItemType('folder')}
                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${newItemType === 'folder' ? 'bg-blue-600 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                        >
                            폴더
                        </button>
                    </div>

                    {/* Name Input */}
                    <input
                        autoFocus
                        type="text"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        placeholder="이름을 입력하세요"
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 focus:bg-white/10 transition-all mb-2.5"
                        onKeyDown={e => e.key === 'Enter' && handleCreateSubmit()}
                    />

                    {/* Actions */}
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => setIsCreating(null)}
                            className="flex-1 py-1.5 text-[11px] font-bold text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleCreateSubmit}
                            className="flex-1 py-1.5 text-[11px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-md shadow-blue-900/30"
                        >
                            생성하기
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Modal (Settings) - Cheonghan Premium Style Refined */}
            {isEditing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 font-sans tracking-tight">

                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800">설정</h3>
                            <span className="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider shadow-sm">
                                {isEditing.type === 'class' ? 'Assignment Room' : 'Folder'}
                            </span>
                        </div>

                        {/* Content */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">이름 수정</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full h-11 px-4 bg-[#F9FAFB] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-800 font-medium transition-all placeholder:text-slate-300"
                                    placeholder="이름을 입력하세요"
                                    onKeyDown={e => e.key === 'Enter' && handleRenameSubmit()}
                                />
                            </div>

                            {/* Move to Folder — primary mobile action */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">폴더 이동</label>
                                <button
                                    onClick={() => {
                                        setIsMoveModalOpen({ id: isEditing.id, type: isEditing.type, name: isEditing.name });
                                        setIsEditing(null);
                                    }}
                                    className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all text-left flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                    다른 폴더로 이동
                                    <svg className="w-3.5 h-3.5 ml-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>

                            {/* Footer / Buttons */}
                            <div className="flex items-center justify-between pt-2">
                                {/* Left: Delete (Subtle) */}
                                <button
                                    onClick={handleDeleteSubmit}
                                    className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors underline decoration-slate-200 underline-offset-4 hover:decoration-red-200"
                                >
                                    항목 삭제
                                </button>

                                {/* Right: Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsEditing(null)}
                                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleRenameSubmit}
                                        className="px-5 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95"
                                    >
                                        저장
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Context Menu (Floating) */}
            {contextMenu && isAdmin && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-[200] bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 w-48 animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: Math.min(contextMenu.y, window.innerHeight - 250), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
                >
                    <div className="px-3 py-1.5 border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{contextMenu.node.name}</span>
                    </div>

                    {/* Copy (과제방만) */}
                    {contextMenu.node.type === 'class' && (
                        <button
                            onClick={handleCopy}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                            <span>📋</span> 복사
                        </button>
                    )}

                    {/* Paste (폴더에만 — 클립보드에 뭔가 있을 때) */}
                    {contextMenu.node.type === 'folder' && clipboard && (
                        <button
                            onClick={() => handlePaste(contextMenu.node.id)}
                            disabled={isOperating}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-green-50 hover:text-green-700 transition-colors disabled:opacity-50"
                        >
                            <span>📌</span> 여기에 붙여넣기
                            {isOperating && <span className="text-[10px] text-slate-400 ml-auto">처리중...</span>}
                        </button>
                    )}

                    {/* Move */}
                    <button
                        onClick={() => {
                            setIsMoveModalOpen({
                                id: contextMenu.node.id,
                                type: contextMenu.node.type,
                                name: contextMenu.node.name
                            });
                            setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                    >
                        <span>➡️</span> 다른 폴더로 이동
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {/* Settings (existing) */}
                    <button
                        onClick={() => {
                            handleSettingsClick(contextMenu.node);
                            setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <span>⚙️</span> 설정 (이름변경/삭제)
                    </button>
                </div>
            )}

            {/* Move Modal — Folder Picker */}
            {isMoveModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">이동할 위치 선택</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            <span className="font-bold text-blue-600">{isMoveModalOpen.name}</span>을(를) 이동합니다.
                        </p>

                        <div className="space-y-1 max-h-60 overflow-y-auto mb-4">
                            {/* Root option */}
                            <button
                                onClick={handleMoveToRoot}
                                disabled={isOperating}
                                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 text-sm font-bold text-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <span className="text-slate-400">🏠</span> 최상위 (루트)
                            </button>
                            {/* Folder options (recursive render) */}
                            {renderFolderOptions(nodes, 0)}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setIsMoveModalOpen(null)}
                                className="flex-1 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Render folder options for move modal (recursive)
    function renderFolderOptions(nodeList: TreeNode[], depth: number): React.ReactNode {
        return nodeList
            .filter(n => n.type === 'folder')
            .filter(n => !isMoveModalOpen || n.originalId !== isMoveModalOpen.id) // Can't move into self
            .map(folder => (
                <div key={folder.id}>
                    <button
                        onClick={() => handleMoveToFolder(folder.originalId)}
                        disabled={isOperating}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm font-medium text-slate-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                        style={{ paddingLeft: `${depth * 16 + 12}px` }}
                    >
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                        {folder.name}
                    </button>
                    {folder.children.length > 0 && renderFolderOptions(folder.children, depth + 1)}
                </div>
            ));
    }
}
