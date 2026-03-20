/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        hbar:    "#00A5E0",
        teal:    "#00e5c0",
        surface: "#111118",
      },
    },
  },
  plugins: [],
}
