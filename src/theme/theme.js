import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#6366F1", light: "#818CF8", dark: "#4F46E5" },
    secondary: { main: "#A855F7" },
    success: { main: "#22C55E" },
    warning: { main: "#F59E0B" },
    info: { main: "#06B6D4" },
    background: { default: "#0A0E1A", paper: "#101526" },
    divider: "#1C2333",
    text: { primary: "#F1F5F9", secondary: "#8B96AB" }
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    h3: { letterSpacing: "-0.04em" },
    h4: { letterSpacing: "-0.03em" },
    h6: { letterSpacing: "-0.02em" }
  },
  shape: { borderRadius: 18 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "@keyframes fadeUp": {
          from: { opacity: 0, transform: "translateY(12px)" },
          to: { opacity: 1, transform: "translateY(0)" }
        },
        "@keyframes fadeIn": {
          from: { opacity: 0 },
          to: { opacity: 1 }
        },
        "@keyframes pulseDot": {
          "0%": { boxShadow: "0 0 0 0 rgba(34,197,94,0.55)" },
          "70%": { boxShadow: "0 0 0 6px rgba(34,197,94,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(34,197,94,0)" }
        },
        "@keyframes driftA": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: 0.55 },
          "50%": { transform: "translate(40px, 30px) scale(1.15)", opacity: 0.85 }
        },
        "@keyframes driftB": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: 0.45 },
          "50%": { transform: "translate(-35px, 25px) scale(1.1)", opacity: 0.7 }
        },
        "@keyframes driftC": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: 0.4 },
          "50%": { transform: "translate(20px, -30px) scale(1.2)", opacity: 0.65 }
        },
        "*": { scrollbarWidth: "thin", scrollbarColor: "#1C2333 transparent" },
        "*::-webkit-scrollbar": { width: 6, height: 6 },
        "*::-webkit-scrollbar-thumb": { background: "#1C2333", borderRadius: 8 },
        body: { backgroundColor: "#0A0E1A" }
      }
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButtonBase: { defaultProps: { disableRipple: false } }
  }
});

export default theme;