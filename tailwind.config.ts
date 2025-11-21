import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                navy: {
                    50: "#f0f4f8",
                    100: "#d9e2ec",
                    200: "#bcccdc",
                    300: "#9fb3c8",
                    400: "#829ab1",
                    500: "#627d98",
                    600: "#486581",
                    700: "#334e68",
                    800: "#243b53",
                    900: "#102a43", // Deep Navy
                    950: "#061523", // Darkest Navy
                },
                galaxy: {
                    100: "#e0f2ff",
                    300: "#90cdf4",
                    500: "#4299e1", // Starry Blue
                    700: "#2b6cb0",
                },
                star: {
                    400: "#f6e05e", // Gold star
                    500: "#ecc94b",
                },
            },
            backgroundImage: {
                "galaxy-gradient": "linear-gradient(to bottom right, #0f2027, #203a43, #2c5364)",
                "deep-space": "linear-gradient(to bottom, #061523, #102a43)",
            },
        },
    },
    plugins: [],
};
export default config;
