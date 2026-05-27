import type { Config } from "tailwindcss";

export default {
    darkMode: 'class',
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#0A0E27',
                    dark: '#06091a',
                    light: '#1e2548',
                },
                background: '#F8FAFC',
                surface: '#FFFFFF',
                slate: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                }
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', '"Apple SD Gothic Neo"', '"Pretendard"', '"Malgun Gothic"', '"맑은 고딕"', 'arial', 'sans-serif'],
            },
            boxShadow: {
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
                'premium': '0 8px 30px rgba(0, 0, 0, 0.04)',
                'premium-hover': '0 12px 40px rgba(0, 0, 0, 0.08)',
                'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
                'card-lg': '0 20px 40px rgba(0, 0, 0, 0.04)',
                'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
            },
            transitionTimingFunction: {
                'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'float-delayed': 'float 6s ease-in-out 3s infinite',
                'pulse-slow': 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in-up': 'fadeInUp 1s ease-out forwards',
                'fade-in-up-delay': 'fadeInUp 1s ease-out 0.3s forwards',
                'shine': 'shine 1.5s linear infinite',
                'fadeIn': 'fadeIn 0.2s ease-out forwards',
                'bounce-slow': 'bounce 2s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                shine: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' }
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                countUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            transitionDuration: {
                '400': '400ms',
            }
        },
    },
    plugins: [],
} satisfies Config;
