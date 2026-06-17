import {
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Box,
    Typography,
    Avatar
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import SchoolIcon from "@mui/icons-material/School";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import AssignmentIcon from "@mui/icons-material/Assignment";

const expandedWidth = 250;
const collapsedWidth = 80;

const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon /> },
    { text: "Students", icon: <SchoolIcon /> },
    { text: "Employers", icon: <BusinessIcon /> },
    { text: "Jobs", icon: <WorkIcon /> },
    { text: "Applications", icon: <AssignmentIcon /> }
];

function Sidebar({ open }) {

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: open ? expandedWidth : collapsedWidth,
                flexShrink: 0,

                "& .MuiDrawer-paper": {
                    width: open ? expandedWidth : collapsedWidth,
                    boxSizing: "border-box",
                    transition: "0.3s",
                    overflowX: "hidden",
                    backgroundColor: "#111827",
                    borderRight: "1px solid #1E293B"
                }
            }}
        >

            <Toolbar />

            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: open ? "flex-start" : "center",
                    gap: 2,
                    p: 2
                }}
            >

                <Avatar sx={{ bgcolor: "#3B82F6" }}>
                    J
                </Avatar>

                {open && (
                    <Typography
                        variant="h6"
                        fontWeight={700}
                    >
                        JobMatrix
                    </Typography>
                )}

            </Box>

            <List>

                {menuItems.map((item) => (

                    <ListItemButton
                        key={item.text}
                        sx={{
                            mx: 1,
                            borderRadius: 3,
                            mb: 1,

                            "&:hover": {
                                backgroundColor: "#1E293B"
                            }
                        }}
                    >

                        <ListItemIcon
                            sx={{
                                color: "#3B82F6",
                                minWidth: 0,
                                mr: open ? 3 : "auto",
                                justifyContent: "center"
                            }}
                        >
                            {item.icon}
                        </ListItemIcon>

                        {open && (
                            <ListItemText primary={item.text} />
                        )}

                    </ListItemButton>

                ))}

            </List>

        </Drawer>
    );
}

export default Sidebar;