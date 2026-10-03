import { useNavigate, useLocation } from "react-router-dom";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Avatar,
  Tooltip,
  Badge,
  IconButton
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import SchoolIcon from "@mui/icons-material/School";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import AssignmentIcon from "@mui/icons-material/Assignment";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";

import useUnreadCount from "../hooks/useUnreadCount";

const expandedWidth = 250;
const collapsedWidth = 80;

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
  { text: "Students", icon: <SchoolIcon />, path: "/students" },
  { text: "Employers", icon: <BusinessIcon />, path: "/employers" },
  { text: "Jobs", icon: <WorkIcon />, path: "/jobs" },
  { text: "Applications", icon: <AssignmentIcon />, path: "/applications" },
  { text: "Notifications", icon: <NotificationsIcon />, path: "/notifications", badge: true },
  { text: "Messages", icon: <SendIcon />, path: "/messages" }
];

function Sidebar({ open, setOpen, isMobile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const unread = useUnreadCount();

  // On mobile the drawer is always shown in full; "open" only controls visibility
  const expanded = isMobile ? true : open;

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) setOpen(false);
  };

  const paperSx = {
    width: isMobile ? expandedWidth : expanded ? expandedWidth : collapsedWidth,
    boxSizing: "border-box",
    transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
    overflowX: "hidden",
    backgroundColor: "#0A0E1A",
    backgroundImage: "none",
    borderRight: "1px solid #1C2333",
    color: "#fff",
    ...(isMobile && { boxShadow: "0 0 48px rgba(0,0,0,0.6)" })
  };

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? open : true}
      onClose={() => setOpen(false)}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: isMobile ? 0 : expanded ? expandedWidth : collapsedWidth,
        flexShrink: 0,
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        // Mobile drawer must sit above the fixed top bar
        zIndex: isMobile ? 1300 : undefined,
        "& .MuiBackdrop-root": {
          backgroundColor: "rgba(5,8,16,0.65)",
          backdropFilter: "blur(3px)"
        },
        "& .MuiDrawer-paper": paperSx
      }}
    >
      {isMobile ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            height: 64,
            borderBottom: "1px solid #1C2333"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              sx={{
                background: "linear-gradient(135deg, #6366F1, #A855F7)",
                width: 36,
                height: 36,
                fontWeight: 700,
                boxShadow: "0 4px 14px rgba(99,102,241,0.35)"
              }}
            >
              J
            </Avatar>
            <Typography variant="h6" fontWeight={700}>
              JobMatrix
            </Typography>
          </Box>
          <IconButton
            onClick={() => setOpen(false)}
            sx={{ color: "#94A3B8", "&:hover": { backgroundColor: "#161D2E", color: "#fff" } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      ) : (
        <>
          <Toolbar sx={{ minHeight: 66 }} />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: expanded ? "flex-start" : "center",
              gap: 1.5,
              px: 2,
              py: 2.5
            }}
          >
            <Avatar
              sx={{
                background: "linear-gradient(135deg, #6366F1, #A855F7)",
                width: 40,
                height: 40,
                fontWeight: 700,
                boxShadow: "0 4px 14px rgba(99,102,241,0.35)"
              }}
            >
              J
            </Avatar>
            {expanded && (
              <Typography variant="h6" fontWeight={700}>
                JobMatrix
              </Typography>
            )}
          </Box>
        </>
      )}

      <List sx={{ px: 1, pt: isMobile ? 2 : 0 }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const count = item.badge ? unread : 0;

          const iconNode =
            item.badge && !expanded ? (
              <Badge
                badgeContent={count}
                max={9}
                color="error"
                sx={{ "& .MuiBadge-badge": { fontSize: 10, fontWeight: 700, minWidth: 16, height: 16 } }}
              >
                {item.icon}
              </Badge>
            ) : (
              item.icon
            );

          const button = (
            <ListItemButton
              key={item.text}
              onClick={() => handleNavigate(item.path)}
              sx={{
                mx: 0.75,
                borderRadius: "12px",
                mb: 0.75,
                py: isMobile ? 1.35 : 1.1,
                position: "relative",
                color: isActive ? "#F8FAFC" : "#94A3B8",
                backgroundColor: isActive ? "rgba(99,102,241,0.14)" : "transparent",
                transition: "all 0.2s ease",
                // Staggered entrance only when the mobile drawer opens
                ...(isMobile && open && {
                  animation: "fadeUp 0.35s ease both",
                  animationDelay: `${0.05 + index * 0.04}s`
                }),
                "&:hover": {
                  backgroundColor: isActive ? "rgba(99,102,241,0.2)" : "#161D2E",
                  transform: "translateX(2px)"
                },
                "&::before": isActive
                  ? {
                      content: '""',
                      position: "absolute",
                      left: -4,
                      top: "20%",
                      height: "60%",
                      width: 3,
                      borderRadius: 4,
                      background: "linear-gradient(180deg, #6366F1, #A855F7)"
                    }
                  : {}
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive ? "#818CF8" : "#64748B",
                  minWidth: 0,
                  mr: expanded ? 2.5 : "auto",
                  justifyContent: "center",
                  transition: "color 0.2s ease"
                }}
              >
                {iconNode}
              </ListItemIcon>

              {expanded && (
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{ fontSize: 15, fontWeight: 600 }}
                />
              )}

              {expanded && count > 0 && (
                <Box
                  sx={{
                    minWidth: 22,
                    height: 22,
                    px: 0.75,
                    borderRadius: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#fff",
                    bgcolor: "#EF4444"
                  }}
                >
                  {count > 9 ? "9+" : count}
                </Box>
              )}
            </ListItemButton>
          );

          return expanded ? (
            button
          ) : (
            <Tooltip key={item.text} title={item.text} placement="right">
              {button}
            </Tooltip>
          );
        })}
      </List>
    </Drawer>
  );
}

export default Sidebar;
