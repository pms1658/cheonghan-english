import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { TenantProvider } from "@/context/TenantContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
    title: "청한영어",
    description: "청한영어 교습소 구조독해 학습 시스템",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#0A0E27" />
                {/* iOS PWA 완성도 */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="청한영어" />
                <link rel="apple-touch-icon" href="/logo.jpg" />
            </head>
            <body className="antialiased min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <Toaster
                        position="top-right"
                        richColors
                        toastOptions={{
                            duration: 3000,
                            style: { fontFamily: 'inherit' },
                        }}
                    />
                    <AuthProvider>
                        <TenantProvider>
                            <main className="mx-auto w-full min-h-screen">
                                {children}
                            </main>
                        </TenantProvider>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
