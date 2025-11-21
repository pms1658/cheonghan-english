"use client";

import { useState } from "react";
import { BookOpen, Upload, Plus, FileText } from "lucide-react";
import { PdfUploadForm } from "@/components/csat-materials/PdfUploadForm";
import { ManualInputForm } from "@/components/csat-materials/ManualInputForm";
import { MaterialsList } from "@/components/csat-materials/MaterialsList";
import { WorkbookGenerator } from "@/components/csat-materials/WorkbookGenerator";

export default function CsatMaterialsPage() {
    const [activeTab, setActiveTab] = useState<"pdf" | "manual">("manual");
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

    const handleMaterialAdded = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-gray-900">수능자료 관리</h2>
                <p className="text-gray-600 mt-2">
                    수능 및 모의고사 지문을 관리하고 교재를 생성하세요
                </p>
            </div>

            {/* Input Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("manual")}
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === "manual"
                                ? "border-navy-950 text-navy-950 font-medium"
                                : "border-transparent text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        <Plus className="h-4 w-4" />
                        수동 입력
                    </button>
                    <button
                        onClick={() => setActiveTab("pdf")}
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === "pdf"
                                ? "border-navy-950 text-navy-950 font-medium"
                                : "border-transparent text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        <Upload className="h-4 w-4" />
                        PDF 업로드
                    </button>
                </div>

                {activeTab === "pdf" ? (
                    <PdfUploadForm onMaterialsExtracted={handleMaterialAdded} />
                ) : (
                    <ManualInputForm onMaterialAdded={handleMaterialAdded} />
                )}
            </div>

            {/* Materials List */}
            <MaterialsList
                refreshTrigger={refreshTrigger}
                onSelectionChange={setSelectedMaterialIds}
            />

            {/* Workbook Generator */}
            <WorkbookGenerator selectedMaterialIds={selectedMaterialIds} />
        </div>
    );
}
