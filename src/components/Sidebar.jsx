import { useState } from "react";
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
  Tooltip
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import SchoolIcon from "@mui/icons-material/School";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import AssignmentIcon from "@mui/icons-material/Assignment";

const expandedWidth = 250;
const collapsedWidth = 80;

const menuItems = [
  {
    text: "Dashboard",
    icon: <DashboardIcon />,
    path: "/"
  },
  {
    text: "Students",
    icon: <SchoolIcon />,
    path: "/students"
  },
  {
    text: "Employers",
    icon: <BusinessIcon />,
    path: "/employers"
  },
  {
    text: "Jobs",
    icon: <WorkIcon />,
    path: "/jobs"
  },
  {
    text: "Applications",
    icon: <AssignmentIcon />,
    path: "/applications"
  }
];
function Sidebar({ open }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? expandedWidth : collapsedWidth,
        flexShrink: 0,
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        "& .MuiDrawer-paper": {
          width: open ? expandedWidth : collapsedWidth,
          boxSizing: "border-box",
          transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
          overflowX: "hidden",
          backgroundColor: "#0A0E1A",
          borderRight: "1px solid #1C2333",
          color: "#fff"
        }
      }}
    >
      <Toolbar sx={{ minHeight: 66 }} />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "flex-start" : "center",
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
            boxShadow: "0 4px 14px rgba(59,130,246,0.35)"
          }}
        >
          J
        </Avatar>

        {open && (
          <Typography variant="h6" fontWeight={700}>
            JobMatrix
          </Typography>
        )}
      </Box>

      <List sx={{ px: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const button = (
            <ListItemButton
              key={item.text}
             onClick={() => navigate(item.path)}
              sx={{
                mx: 0.75,
                borderRadius: 2.5,
                mb: 0.75,
                py: 1.1,
                position: "relative",
                color: isActive ? "#F8FAFC" : "#94A3B8",
                backgroundColor: isActive ? "rgba(59,130,246,0.12)" : "transparent",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: isActive ? "rgba(59,130,246,0.16)" : "#161D2E",
                  transform: "translateX(2px)"
                },
                "&::before": isActive
                  ? {
                      content: '""',
                      position: "absolute",
                      left: -9,
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
                  mr: open ? 2.5 : "auto",
                  justifyContent: "center",
                  transition: "color 0.2s ease"
                }}
              >
                {item.icon}
              </ListItemIcon>

              {open && (
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{ fontSize: 15, fontWeight: 600 }}
                />
              )}
            </ListItemButton>
          );

          return open ? (
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
