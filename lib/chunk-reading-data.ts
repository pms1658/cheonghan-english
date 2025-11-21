import { Passage } from "@/types/chunk-reading";

export const mockPassages: Passage[] = [
    {
        id: "p1",
        title: "2024 수능 모의고사 18번",
        rawText: "The ability to understand and use language is one of the key features that distinguish humans from other animals. Language allows us to communicate complex ideas, share knowledge across generations, and build sophisticated societies. While some animals can communicate using sounds or gestures, human language is unique in its complexity and flexibility.",
        sentences: [
            "The ability to understand and use language is one of the key features that distinguish humans from other animals.",
            "Language allows us to communicate complex ideas, share knowledge across generations, and build sophisticated societies.",
            "While some animals can communicate using sounds or gestures, human language is unique in its complexity and flexibility.",
        ],
        difficulty: "medium",
        source: "2024 수능 모의고사",
        createdBy: "admin-1",
        assignedTo: ["s1", "s2"],
        createdAt: new Date("2025-01-15"),
    },
    {
        id: "p2",
        title: "고난도 지문 - 과학",
        rawText: "Scientists have discovered that certain bacteria can survive in extreme environments where most life forms would perish. These organisms, known as extremophiles, thrive in conditions such as boiling water, freezing temperatures, or highly acidic environments.",
        sentences: [
            "Scientists have discovered that certain bacteria can survive in extreme environments where most life forms would perish.",
            "These organisms, known as extremophiles, thrive in conditions such as boiling water, freezing temperatures, or highly acidic environments.",
        ],
        difficulty: "hard",
        source: "고급 과학 지문",
        createdBy: "admin-1",
        createdAt: new Date("2025-01-18"),
    },
];
