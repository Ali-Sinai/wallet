/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Rooyin", "Vazirmatn", "system-ui", "sans-serif"],
      },
      colors: {
        // Straight from the design bundle.
        bg: "#08090a",
        bgApp: "#0a0c0b",
        card: "#0e1110",
        cardAlt: "#101318",
        cardGreen: "#101a16",
        cardRed: "#1a1214",
        avatar: "#161c1a",
        avatarAlt: "#1a201e",
        line: "rgba(255,255,255,.07)",
        lineSoft: "rgba(255,255,255,.05)",
        hair: "rgba(255,255,255,.08)",
        accent: "#0f9b6e",
        accentInk: "#04120c",
        accentHover: "#12b17e",
        income: "#3fd39a",
        expense: "#ff7a6b",
        barIdle: "#1f2b27",
        text: "#e8eaec",
        // Legacy aliases so older utility classes keep resolving.
        border: "rgba(255,255,255,.07)",
        muted: "rgba(232,234,236,.45)",
        mutedSoft: "rgba(232,234,236,.35)",
      },
      textColor: {
        dim: "rgba(232,234,236,.45)",
        dimmer: "rgba(232,234,236,.35)",
        soft: "rgba(232,234,236,.7)",
      },
      borderColor: {
        chip: "rgba(255,255,255,.14)",
      },
      borderRadius: {
        card: "20px",
        modal: "22px",
        sheet: "26px",
        pill: "99px",
      },
      maxWidth: {
        shell: "1240px",
      },
    },
  },
  plugins: [],
};
