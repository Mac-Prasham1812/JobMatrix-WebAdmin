import { Box, Toolbar } from "@mui/material";
import { useState } from "react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function AdminLayout({ children }) {
  const [open, setOpen] = useState(true);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#0A0E1A",
        position: "relative",
        overflow: "hidden"
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
            width: 520,
            height: 520,
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
            width: 480,
            height: 480,
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
            width: 460,
            height: 460,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.10), transparent 70%)",
            filter: "blur(10px)",
            animation: "driftC 8s ease-in-out infinite"
          }}
        />
      </Box>

      <Topbar open={open} setOpen={setOpen} />
      <Sidebar open={open} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: "100%",
          px: { xs: 2.5, sm: 3.5, md: 5 },
          py: 4,
          minHeight: "100vh",
          position: "relative",
          zIndex: 1,
          animation: "fadeUp 0.4s ease"
        }}
      >
        <Toolbar sx={{ minHeight: 66, mb: 1 }} />
        {children}
      </Box>
    </Box>
  );
}

export default AdminLayout;
