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
        sans: ["var(--font-sans)", "Source Sans 3", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
      },
      colors: {
        white: "#fffdf8",
        slate: {
          50: "#f3efe6",
          100: "#e7e1d2",
          200: "#d4ccb8",
          300: "#b7ad96",
          400: "#6f675c",
          500: "#5c554c",
          600: "#453f37",
          700: "#322d27",
          800: "#231f1b",
          900: "#161310",
          950: "#0c0b09",
        },
        indigo: {
          50: "#e7f3ee",
          100: "#cfe6dc",
          200: "#a4d0c0",
          300: "#6aaf96",
          400: "#3b8f74",
          500: "#21745c",
          600: "#165e4a",
          700: "#114a3b",
          800: "#0e3a2f",
          900: "#0b2c24",
          950: "#061812",
        },
      },
    },
  },
  plugins: [],
};

export default config;
