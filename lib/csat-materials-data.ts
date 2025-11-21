import { CsatMaterial } from "@/types/csat-materials";

// Mock data store (in-memory)
export let mockMaterials: CsatMaterial[] = [
    {
        id: "1",
        year: 2023,
        examType: "6월모평",
        questionNumber: 18,
        questionType: "빈칸추론",
        passage: "Sample passage about environmental science...",
        question: "다음 빈칸에 들어갈 말로 가장 적절한 것은?",
        choices: [
            "adaptation",
            "conservation",
            "exploitation",
            "restoration",
            "preservation"
        ],
        answer: "2",
        explanation: "이 문제는 환경 보존에 관한 내용입니다...",
        createdAt: new Date("2023-06-01")
    },
];

// CRUD functions
export function getAllMaterials(): CsatMaterial[] {
    return [...mockMaterials];
}

export function getMaterialById(id: string): CsatMaterial | undefined {
    return mockMaterials.find(m => m.id === id);
}

export function getMaterialsByYear(year: number): CsatMaterial[] {
    return mockMaterials.filter(m => m.year === year);
}

export function getMaterialsByType(type: string): CsatMaterial[] {
    return mockMaterials.filter(m => m.questionType === type);
}

export function addMaterial(material: Omit<CsatMaterial, "id" | "createdAt">): CsatMaterial {
    const newMaterial: CsatMaterial = {
        ...material,
        id: `material-${Date.now()}`,
        createdAt: new Date()
    };
    mockMaterials.push(newMaterial);
    return newMaterial;
}

export function updateMaterial(id: string, updates: Partial<CsatMaterial>): CsatMaterial | null {
    const index = mockMaterials.findIndex(m => m.id === id);
    if (index === -1) return null;

    mockMaterials[index] = { ...mockMaterials[index], ...updates };
    return mockMaterials[index];
}

export function deleteMaterial(id: string): boolean {
    const index = mockMaterials.findIndex(m => m.id === id);
    if (index === -1) return false;

    mockMaterials.splice(index, 1);
    return true;
}

export function filterMaterials(filters: {
    year?: number;
    examType?: string;
    questionType?: string;
}): CsatMaterial[] {
    return mockMaterials.filter(material => {
        if (filters.year && material.year !== filters.year) return false;
        if (filters.examType && material.examType !== filters.examType) return false;
        if (filters.questionType && material.questionType !== filters.questionType) return false;
        return true;
    });
}
