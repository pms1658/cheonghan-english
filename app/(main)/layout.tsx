import { TopBar } from "@/components/navigation/TopBar";
import { ClassSidebar } from "@/components/navigation/ClassSidebar";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-screen flex flex-col">
            <TopBar />
            <div className="flex-1 flex overflow-hidden">
                <ClassSidebar />
                <main className="flex-1 overflow-y-auto bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
}
