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
        primary: "#374375",
        background: "#FFFCF5",
        secondary: "#BABDE2",
        accent: "#895159",
        peach: "#DFAEA1",

        white: "#FFFFFF",
        text: "#374375",
        muted: "#6F6F86",
        border: "#E7E2DD",
      },

      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
    },
  },

  plugins: [],
};
