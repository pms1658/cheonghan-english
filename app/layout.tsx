import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import { RoleProvider } from "@/contexts/RoleContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "청한영어 (Cheonghan English)",
  description: "Premium English Academy LMS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <UserProvider>
          <RoleProvider>
            {children}
          </RoleProvider>
        </UserProvider>
      </body>
    </html>
  );
}
