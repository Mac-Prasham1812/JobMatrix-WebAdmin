import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Badge
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";

function Topbar({ open, setOpen }) {
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        backgroundColor: "rgba(11,18,32,0.85)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #1C2333",
        zIndex: 1201
      }}
    >
      <Toolbar sx={{ minHeight: 66 }}>
        <IconButton
          color="inherit"
          onClick={() => setOpen(!open)}
          edge="start"
          sx={{
            mr: 1,
            transition: "transform 0.2s ease",
            "&:hover": { transform: "scale(1.08)", backgroundColor: "#161D2E" }
          }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          JobMatrix Admin
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton
            color="inherit"
            sx={{
              transition: "transform 0.2s ease",
              "&:hover": { transform: "scale(1.08)", backgroundColor: "#161D2E" }
            }}
          >
            <Badge variant="dot" color="error" overlap="circular">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <Avatar
            sx={{
              background: "linear-gradient(135deg, #1E293B, #334155)",
              color: "#E2E8F0",
              width: 38,
              height: 38,
              fontWeight: 700,
              fontSize: 14,
              border: "1px solid #334155",
              cursor: "pointer",
              transition: "transform 0.2s ease",
              "&:hover": { transform: "scale(1.06)" }
            }}
          >
            AD
          </Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Topbar;
