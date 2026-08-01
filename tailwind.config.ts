import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "#AA1111",
          50: "#FBEBEB",
          100: "#F5D0D0",
          200: "#E9A2A2",
          300: "#DD7373",
          400: "#D14545",
          500: "#AA1111",
          600: "#8E0E0E",
          700: "#710B0B",
          800: "#550808",
          900: "#390606",
          950: "#240303",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-anton)", "Impact", "sans-serif"],
      },
      maxWidth: {
        "8xl": "90rem",
      },
      backgroundImage: {
        "hero-overlay":
          "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.45))",
        "home-hero-overlay":
          "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.65) 100%)",
        "home-hero-overlay-mobile":
          "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.7) 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
