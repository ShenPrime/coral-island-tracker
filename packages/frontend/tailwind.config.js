/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Vibrant coral pink/red - like coral reefs
        coral: {
          50: "#fff1f3",
          100: "#ffe0e5",
          200: "#ffc7d1",
          300: "#ffa3b4",
          400: "#ff6b8a",
          500: "#ff3d6b",
          600: "#f01d56",
          700: "#cc1048",
          800: "#a81142",
          900: "#8c133d",
        },
        // Tropical turquoise/teal ocean
        ocean: {
          50: "#edfffe",
          100: "#c0fffc",
          200: "#81fffa",
          300: "#3afbf5",
          400: "#00e5df",
          500: "#00c9c4",
          600: "#00a3a1",
          700: "#008280",
          800: "#006566",
          900: "#044f50",
          950: "#003035",
        },
        // Warm tropical sand/gold
        sand: {
          50: "#fffbeb",
          100: "#fff3c6",
          200: "#ffe588",
          300: "#ffd24a",
          400: "#ffbe20",
          500: "#f99b07",
          600: "#dd7302",
          700: "#b75006",
          800: "#943d0c",
          900: "#7a330d",
        },
        // Lush tropical green
        palm: {
          50: "#edfff4",
          100: "#d5ffe6",
          200: "#aeffcf",
          300: "#70ffab",
          400: "#2bfd7f",
          500: "#00e85c",
          600: "#00c249",
          700: "#00973c",
          800: "#067633",
          900: "#07612c",
        },
        // Deep sea purple/blue for backgrounds
        deepsea: {
          50: "#e6f0f5",
          100: "#c0d9e8",
          200: "#96c0d9",
          300: "#6ba7ca",
          400: "#4b94be",
          500: "#2b81b2",
          600: "#2470a0",
          700: "#1e3a5f",
          800: "#162c4a",
          900: "#0f1f35",
          950: "#0a1525",
        },
      },
    },
  },
  plugins: [],
};
