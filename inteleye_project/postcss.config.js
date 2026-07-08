import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],

  theme: {

    extend: {
colors: {
  primary: "#19090A",      // اللون الأساسي
  secondary: "#3B1B1D",    // اللون الثانوي
  accent: "#714248",       // اللون المساعد
  olive: "#888157",        // اللون الزيتي

  background: "#F8F6F1",   // خلفية الموقع
  surface: "#FFFFFF",      // الكروت والصناديق

  text: "#19090A",         // لون النص الأساسي
  muted: "#6E6663",        // النصوص الثانوية

  border: "#E8E2D8",       // الحدود
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
