"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Folder, Plus, ChevronRight, ChevronDown, MoreHorizontal, FolderPlus } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { getAllClasses, createClass, deleteClass } from "@/lib/vocabulary-data";
import { VocabularyClass } from "@/types/vocabulary";

export function ClassSidebar() {
    const { role } = useRole();
    const pathname = usePathname();
    const [classes, setClasses] = useState<VocabularyClass[]>([]);
    const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [creatingParentId, setCreatingParentId] = useState<string | undefined>(undefined);
    const [newClassName, setNewClassName] = useState("");

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = () => {
        const allClasses = getAllClasses();
        setClasses(allClasses);
    };

    const toggleExpand = (classId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newExpanded = new Set(expandedClasses);
        if (newExpanded.has(classId)) {
            newExpanded.delete(classId);
        } else {
            newExpanded.add(classId);
        }
        setExpandedClasses(newExpanded);
    };

    const handleCreateClass = () => {
        if (!newClassName.trim()) {
            alert("클래스 이름을 입력하세요.");
            return;
        }

        createClass({
            name: newClassName,
            parentClassId: creatingParentId,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
        });

        setNewClassName("");
        setShowCreateForm(false);
        setCreatingParentId(undefined);
        loadClasses();

        // If creating a subclass, ensure parent is expanded
        if (creatingParentId) {
            const newExpanded = new Set(expandedClasses);
            newExpanded.add(creatingParentId);
            setExpandedClasses(newExpanded);
        }
    };

    const handleDeleteClass = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("클래스를 삭제하시겠습니까? 하위 클래스와 세트도 모두 삭제됩니다.")) {
            deleteClass(id);
            loadClasses();
        }
    };

    const startCreateSubclass = (parentId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCreatingParentId(parentId);
        setShowCreateForm(true);
    };

    // Recursive render function
    const renderClassItem = (cls: VocabularyClass, depth: number = 0) => {
        const children = classes.filter(c => c.parentClassId === cls.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedClasses.has(cls.id);
        const isActive = pathname.startsWith(`/class/${cls.id}`);

        return (
            <div key={cls.id}>
                <div
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${isActive ? "bg-navy-950 text-white" : "text-gray-700 hover:bg-gray-100"
                        }`}
                    style={{ paddingLeft: `${depth * 12 + 12}px` }}
                >
                    {/* Expand Toggle */}
                    <button
                        onClick={(e) => toggleExpand(cls.id, e)}
                        className={`p-0.5 rounded hover:bg-black/10 ${hasChildren ? "visible" : "invisible"}`}
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                        ) : (
                            <ChevronRight className="h-3 w-3" />
                        )}
                    </button>

                    {/* Link to Class */}
                    <Link href={`/class/${cls.id}`} className="flex-1 flex items-center gap-2 min-w-0">
                        <div
                            className="w-3 h-3 rounded flex-shrink-0"
                            style={{ backgroundColor: cls.color }}
                        />
                        <span className="text-sm font-medium truncate">{cls.name}</span>
                    </Link>

                    {/* Actions (Admin Only) */}
                    {role === "admin" && (
                        <div className="hidden group-hover:flex items-center gap-1">
                            <button
                                onClick={(e) => startCreateSubclass(cls.id, e)}
                                className="p-1 hover:bg-black/10 rounded"
                                title="하위 클래스 생성"
                            >
                                <Plus className="h-3 w-3" />
                            </button>
                            <button
                                onClick={(e) => handleDeleteClass(cls.id, e)}
                                className="p-1 hover:bg-red-500/20 hover:text-red-500 rounded"
                                title="삭제"
                            >
                                <MoreHorizontal className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Children */}
                {isExpanded && hasChildren && (
                    <div className="mt-1">
                        {children.map(child => renderClassItem(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    // Get root classes
    const rootClasses = classes.filter(c => !c.parentClassId);

    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase">클래스</h2>
                    {role === "admin" && (
                        <button
                            onClick={() => {
                                setCreatingParentId(undefined);
                                setShowCreateForm(!showCreateForm);
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="새 최상위 클래스"
                        >
                            <FolderPlus className="h-4 w-4 text-gray-700" />
                        </button>
                    )}
                </div>
            </div>

            {/* Create Form */}
            {showCreateForm && role === "admin" && (
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <div className="text-xs text-gray-500 mb-1">
                        {creatingParentId
                            ? `"${classes.find(c => c.id === creatingParentId)?.name}"의 하위 클래스`
                            : "새 최상위 클래스"}
                    </div>
                    <input
                        type="text"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleCreateClass()}
                        placeholder="클래스 이름..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-navy-950"
                        autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={handleCreateClass}
                            className="flex-1 px-3 py-1.5 bg-navy-950 hover:bg-navy-900 text-white text-sm rounded"
                        >
                            생성
                        </button>
                        <button
                            onClick={() => {
                                setShowCreateForm(false);
                                setNewClassName("");
                                setCreatingParentId(undefined);
                            }}
                            className="flex-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded"
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}

            {/* Class Tree */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {rootClasses.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                        {role === "admin" ? "클래스를 생성하세요" : "가입된 클래스가 없습니다"}
                    </div>
                ) : (
                    rootClasses.map(cls => renderClassItem(cls))
                )}
            </div>

            {/* Footer Info */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-600">
                    {role === "admin" ? "관리자" : "학생"} • {classes.length}개 클래스
                </p>
            </div>
        </div>
    );
}
