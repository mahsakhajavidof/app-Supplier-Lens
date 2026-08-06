/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', "Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        // Design tokens lifted directly from the Supplier Lens mockups, so
        // the built app matches pixel-for-pixel without re-deriving a palette.
        ink: "#243746", // primary text
        muted: "#6B7C89", // secondary text
        link: "#1F4F6F", // headings on tinted backgrounds, links
        placeholder: "#96A5B0",
        border: "#DCE7EE",
        accent: {
          DEFAULT: "#4A9FD1",
          hover: "#3D8DBD",
        },
        surface: {
          tint: "#EAF5FC", // stat cards, AI panels
          subtle: "#F4F9FD", // table header rows, filter bars
          chip: "#DCEFFA", // active nav / badges
        },
        warn: {
          bg: "#FFF4D6",
          fg: "#7A5A12",
        },
        danger: {
          bg: "#FDE7E7",
          fg: "#8C3A3A",
          border: "#F3D3D3",
        },
        neutral: {
          bg: "#F1F5F8",
          fg: "#5A6B78",
        },
      },
      borderRadius: {
        lg: "14px",
        md: "11px",
        sm: "9px",
      },
    },
  },
  plugins: [],
};
