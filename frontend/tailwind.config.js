/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Vazirmatn", "system-ui", "sans-serif"],
      },
      colors: {
        bg: "#08090a",
        card: "#0e1110",
        cardAlt: "#101318",
        border: "rgba(255,255,255,.07)",
        accent: "#0f9b6e",
        accentSoft: "rgba(15,155,110,.3)",
        income: "#3fd39a",
        expense: "#ff7a6b",
        muted: "rgba(232,234,236,.45)",
        mutedSoft: "rgba(232,234,236,.35)",
        text: "#e8eaec",
      },
      borderRadius: {
        card: "20px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};
