"use client";

import { Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkbookGeneratorProps {
    selectedMaterialIds: string[];
}

export function WorkbookGenerator({ selectedMaterialIds }: WorkbookGeneratorProps) {
    const handleGeneratePdf = () => {
        if (selectedMaterialIds.length === 0) {
            alert("교재에 포함할 자료를 선택해주세요.");
            return;
        }

        // TODO: Implement PDF generation
        alert(`${selectedMaterialIds.length}개 자료로 교재 생성 기능은 추후 구현됩니다.`);
    };

    return (
        <Card className="bg-white border-gray-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                    <FileText className="h-5 w-5" />
                    교재 생성
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                선택된 자료: <span className="text-blue-600">{selectedMaterialIds.length}개</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                자료 목록에서 교재에 포함할 문제를 선택하세요
                            </p>
                        </div>
                        <button
                            onClick={handleGeneratePdf}
                            disabled={selectedMaterialIds.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-navy-950 hover:bg-navy-900 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-lg transition-all font-medium"
                        >
                            <Download className="h-4 w-4" />
                            PDF 생성
                        </button>
                    </div>
                </div>

                {selectedMaterialIds.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-gray-700">
                            <strong>💡 안내:</strong> 선택한 자료들이 하나의 PDF 교재로 생성됩니다.
                            <br />
                            - 문제 순서는 년도 및 문제 번호 순으로 정렬됩니다
                            <br />
                            - 출력 레이아웃은 추후 커스터마이징 가능합니다
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
