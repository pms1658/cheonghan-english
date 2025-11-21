"use client";

import { useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PdfUploadFormProps {
    onMaterialsExtracted?: (materials: any[]) => void;
}

export function PdfUploadForm({ onMaterialsExtracted }: PdfUploadFormProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [extractedMaterials, setExtractedMaterials] = useState<any[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setExtractedMaterials([]);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;

        setIsAnalyzing(true);
        try {
            // TODO: Implement Gemini PDF analysis
            // For now, show placeholder
            await new Promise(resolve => setTimeout(resolve, 2000));

            alert("PDF 분석 기능은 Gemini API 연동 후 사용 가능합니다.\n현재는 수동 입력을 사용해주세요.");

        } catch (error) {
            console.error("PDF analysis error:", error);
            alert("PDF 분석 중 오류가 발생했습니다.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Card className="bg-white border-gray-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Upload className="h-5 w-5" />
                    PDF 파일 업로드
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        모의고사/수능 PDF 파일
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="flex-1 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-navy-950 file:text-white hover:file:bg-navy-900"
                        />
                        {file && (
                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                className="px-4 py-2 bg-navy-950 hover:bg-navy-900 disabled:bg-gray-300 text-white rounded transition-all flex items-center gap-2"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        분석 중...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="h-4 w-4" />
                                        자동 분석
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                    {file && (
                        <p className="text-xs text-gray-500 mt-2">
                            선택된 파일: {file.name}
                        </p>
                    )}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-700">
                        <strong>💡 안내:</strong> PDF 파일을 업로드하면 Gemini AI가 자동으로 문제를 분석합니다.
                        <br />
                        - 년도, 시험 유형, 문제 번호 추출
                        <br />
                        - 문제 유형 자동 판별 (빈칸추론, 순서배열 등)
                        <br />
                        - 지문, 문제, 정답 분리
                    </p>
                </div>

                {extractedMaterials.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                            추출된 문제: {extractedMaterials.length}개
                        </h3>
                        {/* TODO: Show extracted materials preview */}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
