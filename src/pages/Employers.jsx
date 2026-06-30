import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  Avatar,
  Stack
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";
import ApartmentIcon from "@mui/icons-material/Apartment";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../firebase/firebase";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

function Employers() {
  const [employers, setEmployers] = useState([]);
  const [filteredEmployers, setFilteredEmployers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployers();
  }, []);

  useEffect(() => {
    const value = search.toLowerCase().trim();

    const filtered = employers.filter((employer) => {
      const name = (employer.name || "").toLowerCase();
      const email = (employer.email || "").toLowerCase();
      const phone = (employer.phone || "").toLowerCase();

      return name.includes(value) || email.includes(value) || phone.includes(value);
    });

    setFilteredEmployers(filtered);
  }, [search, employers]);

  const loadEmployers = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "Employer"));
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setEmployers(data);
      setFilteredEmployers(data);
    } catch (error) {
      console.log("Error loading employers:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({ total: employers.length }), [employers]);

  const columns = [
    {
      field: "name",
      headerName: "Name",
      flex: 1.3,
      minWidth: 200,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.3} alignItems="center" sx={{ height: "100%" }}>
          <Avatar
            sx={{
              width: 30,
              height: 30,
              fontSize: 12,
              fontWeight: 700,
              bgcolor: "rgba(168,85,247,0.16)",
              color: "secondary.main",
              border: "1px solid rgba(168,85,247,0.3)"
            }}
          >
            {initials(params.value)}
          </Avatar>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>
            {params.value || "-"}
          </Typography>
        </Stack>
      )
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1.6,
      minWidth: 220
    },
    {
      field: "phone",
      headerName: "Phone",
      flex: 1,
      minWidth: 140
    },
    {
      field: "role",
      headerName: "Role",
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => (
        <Chip
          label={params.value || "Employer"}
          size="small"
          sx={{
            bgcolor: "rgba(168,85,247,0.12)",
            color: "secondary.main",
            border: "1px solid rgba(168,85,247,0.22)",
            fontWeight: 700
          }}
        />
      )
    },
    {
      field: "uid",
      headerName: "UID",
      flex: 2,
      minWidth: 260
    }
  ];

  return (
    <Box sx={{ width: "100%", maxWidth: "1600px" }}>
      <Card
        sx={{
          mb: 3,
          position: "relative",
          overflow: "hidden",
          borderRadius: 3.5,
          background: "linear-gradient(135deg, rgba(16,21,38,0.95), rgba(13,18,32,0.95))",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
          animation: "fadeUp 0.45s ease both"
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,85,247,0.22), transparent 70%)",
            animation: "driftB 9s ease-in-out infinite",
            pointerEvents: "none"
          }}
        />
        <CardContent sx={{ p: 3, position: "relative" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} color="text.primary">
                Employers
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Manage all registered employers.
              </Typography>
            </Box>

            <BusinessIcon sx={{ fontSize: 50, color: "secondary.main" }} />
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, mt: 2.5, flexWrap: "wrap" }}>
            <Chip
              icon={<ApartmentIcon sx={{ fontSize: 16, color: "secondary.main !important" }} />}
              label={`Total Employers: ${stats.total}`}
              sx={{
                bgcolor: "rgba(168,85,247,0.12)",
                color: "secondary.main",
                border: "1px solid rgba(168,85,247,0.22)",
                fontWeight: 700
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: 3.5,
          background: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
          animation: "fadeUp 0.5s ease both",
          animationDelay: "0.08s"
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <TextField
            fullWidth
            placeholder="Search employer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                color: "#fff",
                backgroundColor: "#0D1220",
                borderRadius: 2.5,
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                "& fieldset": { borderColor: "divider" },
                "&:hover fieldset": { borderColor: "#2A3447" },
                "&.Mui-focused fieldset": { borderColor: "secondary.main" },
                "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(168,85,247,0.18)" }
              },
              "& .MuiInputBase-input::placeholder": { color: "text.secondary", opacity: 1 }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.secondary" }} />
                </InputAdornment>
              )
            }}
          />

          {loading ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1.5} py={6} sx={{ animation: "fadeIn 0.3s ease" }}>
              <CircularProgress sx={{ color: "secondary.main" }} />
              <Typography color="text.secondary" fontSize={13}>
                Loading employers...
              </Typography>
            </Box>
          ) : filteredEmployers.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={8} sx={{ animation: "fadeIn 0.35s ease" }}>
              <BusinessIcon sx={{ fontSize: 42, color: "text.secondary", opacity: 0.5 }} />
              <Typography color="text.secondary">No employers found.</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                height: 600,
                width: "100%",
                animation: "fadeIn 0.4s ease",
                "& .MuiDataGrid-root": { border: 0 }
              }}
            >
              <DataGrid
                rows={filteredEmployers}
                columns={columns}
                pageSizeOptions={[5, 10, 20, 50]}
                disableRowSelectionOnClick
                initialState={{
                  pagination: { paginationModel: { pageSize: 10, page: 0 } }
                }}
                sx={{
                  border: 0,
                  color: "#fff",
                  backgroundColor: "background.paper",
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#0D1220",
                    color: "text.primary",
                    borderBottom: "1px solid",
                    borderColor: "divider"
                  },
                  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700 },
                  "& .MuiDataGrid-cell": { borderColor: "divider" },
                  "& .MuiDataGrid-row": {
                    backgroundColor: "background.paper",
                    transition: "background-color 0.15s ease",
                    "&:hover": { backgroundColor: "#151B2E" }
                  },
                  "& .MuiDataGrid-footerContainer": {
                    borderTop: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "#0D1220",
                    color: "text.primary"
                  },
                  "& .MuiTablePagination-root": { color: "text.primary" },
                  "& .MuiDataGrid-toolbarContainer": { color: "text.primary" },
                  "& .MuiCheckbox-root": { color: "text.secondary" },
                  "& .MuiDataGrid-filler": { backgroundColor: "background.paper" },
                  "& .MuiDataGrid-scrollbarFiller": { backgroundColor: "background.paper" }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default Employers;
