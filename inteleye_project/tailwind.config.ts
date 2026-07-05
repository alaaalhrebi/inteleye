import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],

  theme: {

    extend: {

      colors: {

        primary: "#166534",

        secondary: "#C8A648",

        background: "#F8FAF8",

        dark: "#16352B"

      },

      borderRadius: {

        xl: "1rem",

        "2xl": "1.5rem",

        "3xl": "2rem"

      }

    }

  },

  plugins: []

} satisfies Config;