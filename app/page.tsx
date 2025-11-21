"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Star } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Mock login delay
    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-deep-space relative overflow-hidden">
      {/* Background Stars Animation (CSS needed for full effect, simple static for now) */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 text-star-400 opacity-50 animate-pulse">
          <Star className="h-4 w-4" />
        </div>
        <div className="absolute bottom-20 right-20 text-star-500 opacity-30 animate-pulse delay-700">
          <Star className="h-6 w-6" />
        </div>
        <div className="absolute top-1/3 right-1/4 text-galaxy-300 opacity-40 animate-pulse delay-300">
          <Star className="h-3 w-3" />
        </div>
      </div>

      <Card className="w-full max-w-md bg-navy-900/80 border-navy-700 backdrop-blur-sm shadow-2xl shadow-galaxy-900/20 z-10">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-navy-800 p-3 rounded-full w-fit mb-2 border border-navy-700">
            <Star className="h-8 w-8 text-galaxy-400 fill-galaxy-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-wider">
            청한영어
          </CardTitle>
          <p className="text-navy-300 text-sm">Blue Galaxy English Academy</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-navy-200">
                아이디
              </label>
              <input
                id="email"
                type="text"
                placeholder="student_id"
                className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-navy-200">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-galaxy-600 hover:bg-galaxy-500 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-galaxy-900/50 mt-6"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "로그인"
              )}
            </button>
            <div className="text-center text-xs text-navy-400 mt-4">
              계정이 없으신가요? <span className="text-galaxy-400 cursor-pointer hover:underline">관리자에게 문의하세요</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
