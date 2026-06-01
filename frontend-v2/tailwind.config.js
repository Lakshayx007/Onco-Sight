/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F9FAFB",
        surface: "#FFFFFF",
        primary: "#0A2540",
        accent: "#6366F1",
        muted: "#64748B",
        border: "#E2E8F0"
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
