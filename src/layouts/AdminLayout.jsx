import { Box, Toolbar } from "@mui/material";
import { useState } from "react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function AdminLayout({ children }) {

    const [open, setOpen] = useState(true);

    return (

        <Box sx={{ display: "flex" }}>

            <Topbar
                open={open}
                setOpen={setOpen}
            />

            <Sidebar open={open} />

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 4,
                    minHeight: "100vh"
                }}
            >

                <Toolbar />

                {children}

            </Box>

        </Box>

    );
}

export default AdminLayout;