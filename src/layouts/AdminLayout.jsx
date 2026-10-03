import { Box, Toolbar, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function AdminLayout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Desktop: sidebar expanded by default. Mobile: drawer closed by default.
  const [open, setOpen] = useState(() => window.innerWidth >= 900);

  // Reset when crossing the breakpoint (rotate phone, resize window)
  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#0A0E1A",
        position: "relative",
        overflowX: "hidden"
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "-10%",
            left: "-5%",
            width: { xs: 320, md: 520 },
            height: { xs: 320, md: 520 },
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.16), transparent 70%)",
            filter: "blur(10px)",
            animation: "driftA 7s ease-in-out infinite"
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: "10%",
            right: "-8%",
            width: { xs: 300, md: 480 },
            height: { xs: 300, md: 480 },
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,85,247,0.14), transparent 70%)",
            filter: "blur(10px)",
            animation: "driftB 6s ease-in-out infinite"
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "-15%",
            left: "30%",
            width: { xs: 280, md: 460 },
            height: { xs: 280, md: 460 },
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.10), transparent 70%)",
            filter: "blur(10px)",
            animation: "driftC 8s ease-in-out infinite"
          }}
        />
      </Box>

      <Topbar open={open} setOpen={setOpen} isMobile={isMobile} />
      <Sidebar open={open} setOpen={setOpen} isMobile={isMobile} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // minWidth 0 lets wide tables scroll inside their own box instead of stretching the page
          minWidth: 0,
          width: "100%",
          px: { xs: 1.75, sm: 3.5, md: 5 },
          py: { xs: 2.5, md: 4 },
          minHeight: "100vh",
          position: "relative",
          zIndex: 1,
          animation: "fadeUp 0.4s ease"
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 66 }, mb: 1 }} />
        {children}
      </Box>
    </Box>
  );
}

export default AdminLayout;
