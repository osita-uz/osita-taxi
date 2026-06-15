/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts,tsx}"],
  corePlugins: {
    // Ant Design Vue o'zining reset stillarini ishlatadi
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#1D56C3",
          50: "#eef3ff",
          100: "#dce7ff",
          200: "#b9ceff",
          400: "#387af4",
          500: "#1D56C3",
          600: "#1744a0",
          700: "#133580",
          900: "#091840",
        },
        accent: {
          DEFAULT: "#F59E0B",
          light: "#FDE68A",
          dark: "#D97706",
        },
        navy: {
          DEFAULT: "#0C1F3F",
          light: "#1a3460",
        },
        surface: "#FFFFFF",
        muted: "#6B7280",
        "bg-base": "#F0F4FF",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 2px 12px rgba(29,86,195,0.08)",
        "card-hover": "0 4px 20px rgba(29,86,195,0.14)",
        nav: "0 -4px 20px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
