import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-fira-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-fira-code)", "monospace"],
      },
      colors: {
        primary: "#0369A1",
        secondary: "#0EA5E9",
        accent: "#22C55E",
      },
    },
  },
  plugins: [],
};

export default config;
