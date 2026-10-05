import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Manrope", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
      },
      colors: {
        white: "#ffffff",
        slate: {
          50: "#f4f5f7",
          100: "#e8eaef",
          200: "#d5d9e2",
          300: "#b4bbc8",
          400: "#7c8596",
          500: "#5c6576",
          600: "#3f4758",
          700: "#2b3242",
          800: "#1b2130",
          900: "#11151e",
          950: "#0b0e14",
        },
        indigo: {
          50: "#eef0ff",
          100: "#e0e4ff",
          200: "#c6cdff",
          300: "#a3adfc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
