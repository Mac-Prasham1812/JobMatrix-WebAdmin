import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Avatar
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";

function Topbar({ open, setOpen }) {

    return (

        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                backgroundColor: "#111827",
                borderBottom: "1px solid #1E293B",
                zIndex: 1201
            }}
        >

            <Toolbar>

                <IconButton
                    color="inherit"
                    onClick={() => setOpen(!open)}
                >
                    <MenuIcon />
                </IconButton>

                <Typography
                    variant="h6"
                    sx={{
                        flexGrow: 1,
                        fontWeight: 700
                    }}
                >
                    JobMatrix Admin
                </Typography>

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2
                    }}
                >

                    <NotificationsIcon />

                    <Avatar>
                        A
                    </Avatar>

                </Box>

            </Toolbar>

        </AppBar>

    );
}

export default Topbar;