/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rarity: {
          consumer: "#b0c3d9",
          industrial: "#5e98d9",
          milspec: "#4b69ff",
          restricted: "#8847ff",
          classified: "#d32ce6",
          covert: "#eb4b4b",
          contraband: "#e4ae39",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
