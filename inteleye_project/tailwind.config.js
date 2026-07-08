/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      fontFamily: {
        sans: ["Tajawal", "system-ui", "sans-serif"],
      },

      colors: {
        primary: "#19090A",
        secondary: "#3B1B1D",
        accent: "#714248",
        olive: "#888157",

        background: "#F8F6F1",
        surface: "#FFFFFF",

        text: "#19090A",
        muted: "#6E6663",

        border: "#E8E2D8",
      },
    },
  },

  plugins: [],
};
