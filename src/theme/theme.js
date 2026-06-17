import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#3B82F6",
        },
        secondary: {
            main: "#6366F1",
        },
        background: {
            default: "#0F172A",
            paper: "#1E293B",
        },
    },

    typography: {
        fontFamily: "Inter, sans-serif",
    },

    shape: {
        borderRadius: 16,
    },
});

export default theme;