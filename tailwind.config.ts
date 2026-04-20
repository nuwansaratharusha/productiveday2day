import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      // ── Typography ─────────────────────────────────────────
      // body / UI copy → Inter (clean, data-dense, enterprise)
      // branded headings → Sora (via h1-h3 CSS rule or font-display class)
      fontFamily: {
        sans:    ["Inter",  "system-ui", "-apple-system", "sans-serif"],
        display: ["Sora",   "system-ui", "-apple-system", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "Menlo", "monospace"],
      },

      // ── Type scale ─────────────────────────────────────────
      // Named sizes used consistently across components
      fontSize: {
        "2xs":   ["10px", { lineHeight: "14px", letterSpacing: "0.01em" }],
        xs:      ["11px", { lineHeight: "16px" }],
        sm:      ["13px", { lineHeight: "20px" }],
        base:    ["14px", { lineHeight: "22px" }],
        md:      ["15px", { lineHeight: "24px" }],
        lg:      ["16px", { lineHeight: "24px" }],
        xl:      ["18px", { lineHeight: "28px" }],
        "2xl":   ["20px", { lineHeight: "28px" }],
        "3xl":   ["24px", { lineHeight: "32px" }],
        "4xl":   ["28px", { lineHeight: "36px" }],
      },

      // ── Colors ─────────────────────────────────────────────
      colors: {
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT:    "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        zip: {
          red:    "hsl(var(--zip-red))",
          orange: "hsl(var(--zip-orange))",
          black:  "hsl(var(--zip-black))",
          gray:   "hsl(var(--zip-gray))",
          light:  "hsl(var(--zip-light))",
          surface: "hsl(var(--zip-surface))",
        },
        sidebar: {
          DEFAULT:             "hsl(var(--sidebar-background))",
          foreground:          "hsl(var(--sidebar-foreground))",
          primary:             "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:              "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border:              "hsl(var(--sidebar-border))",
          ring:                "hsl(var(--sidebar-ring))",
        },
      },

      // ── Border radius ──────────────────────────────────────
      borderRadius: {
        none: "0",
        sm:   "calc(var(--radius) - 6px)",   // 8px
        md:   "calc(var(--radius) - 2px)",   // 12px
        lg:   "var(--radius)",               // 14px
        xl:   "calc(var(--radius) + 4px)",   // 18px
        "2xl":"calc(var(--radius) + 10px)",  // 24px
        "3xl":"calc(var(--radius) + 18px)",  // 32px
        full: "9999px",
      },

      // ── Easing ────────────────────────────────────────────
      transitionTimingFunction: {
        spring:  "cubic-bezier(0.16, 1, 0.3, 1)",   // snappy, overshoots slightly
        bounce:  "cubic-bezier(0.34, 1.56, 0.64, 1)", // bouncy
        smooth:  "cubic-bezier(0.4, 0, 0.2, 1)",    // smooth ease-in-out
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      // ── Keyframes ─────────────────────────────────────────
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
