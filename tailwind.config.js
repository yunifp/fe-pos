/** @type {import('tailwindcss').Config} */
module.exports = {
  // PERHATIKAN BARIS INI: Pastikan menunjuk ke folder src dan App.tsx
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        secondary: "#0F172A",
        accent: "#F59E0B",
      },
    },
  },
  plugins: [],
};
