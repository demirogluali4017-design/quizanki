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
          50: "#f7f5f2",
          100: "#efece6",
          200: "#e0dcd4",
          300: "#c9c4ba",
          400: "#9a968c",
          500: "#6f6b62",
          600: "#4a463f",
          700: "#2f2c28",
          800: "#1c1915",
          900: "#11100e",
          950: "#0b0b0c",
        },
        indigo: {
          50: "#faf6f5",
          100: "#f4e8e6",
          200: "#e8d0cc",
          300: "#d9b0a8",
          400: "#c87a6e",
          500: "#c45c4a",
          600: "#b04d3c",
          700: "#8f3e30",
          800: "#6e3025",
          900: "#4d221b",
          950: "#2a120e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
