import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";

import { useAuth } from "../context/AuthContext";

function Topbar({ open, setOpen }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const { signOut } = useAuth();

  const openMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const closeMenu = () => {
    setAnchorEl(null);
  };

 const handleLogout = async () => {
  closeMenu();

  try {
    await signOut();
  } catch (error) {
    console.error(error);
  }
};

  return (
    <>
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
              "&:hover": {
                transform: "scale(1.08)",
                backgroundColor: "#161D2E"
              }
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
                "&:hover": {
                  transform: "scale(1.08)",
                  backgroundColor: "#161D2E"
                }
              }}
            >
              <Badge variant="dot" color="error" overlap="circular">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <Avatar
              onClick={openMenu}
              sx={{
                background: "linear-gradient(135deg,#1E293B,#334155)",
                color: "#E2E8F0",
                width: 38,
                height: 38,
                fontWeight: 700,
                fontSize: 14,
                border: "1px solid #334155",
                cursor: "pointer",
                transition: "all .25s ease",
                "&:hover": {
                  transform: "scale(1.08)",
                  boxShadow: "0 0 18px rgba(99,102,241,.35)"
                }
              }}
            >
              AD
            </Avatar>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={closeMenu}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              PaperProps={{
                sx: {
                  mt: 1,
                  width: 240,
                  borderRadius: 3,
                  background: "#101526",
                  border: "1px solid #1C2333",
                  color: "#fff",
                  boxShadow: "0 15px 40px rgba(0,0,0,.45)"
                }
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography fontWeight={700}>Administrator</Typography>
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                  Admin Panel
                </Typography>
              </Box>

              <Divider sx={{ borderColor: "#1C2333" }} />

              <MenuItem onClick={closeMenu}>
                <ListItemIcon>
                  <PersonIcon sx={{ color: "#818CF8" }} />
                </ListItemIcon>
                Profile
              </MenuItem>

              <Divider sx={{ borderColor: "#1C2333" }} />

              <MenuItem
                onClick={handleLogout}
                sx={{ color: "#EF4444" }}
              >
                <ListItemIcon>
                  <LogoutIcon sx={{ color: "#EF4444" }} />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
    </>
  );
}

export default Topbar;
