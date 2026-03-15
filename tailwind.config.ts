import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { mono: ["var(--font-mono)", "monospace"] },
      colors: {
        surface: "#0a0a0a",
        panel: "#111111",
        border: "#1e1e1e",
        muted: "#333333",
        accent: "#5b5bd6",
      },
    },
  },
  plugins: [],
} satisfies Config;
