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
  Stack,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Fade
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";
import ApartmentIcon from "@mui/icons-material/Apartment";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../firebase/firebase";
import UserAvatar from "../components/UserAvatar";
import { exportToCsv } from "../utils/exportCsv";

function formatTime(value) {
  if (!value) return "-";
  if (typeof value?.toMillis === "function") return new Date(value.toMillis()).toLocaleString();
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000).toLocaleString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function Employers() {
  const [employers, setEmployers] = useState([]);
  const [filteredEmployers, setFilteredEmployers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);

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

      // Count jobs per employer (matched by uid via "postedBy" field).
      // NOTE: verify this field name matches your Jobs.jsx / AddJobActivity schema.
      const jobsSnapshot = await getDocs(collection(db, "jobs"));
      const countMap = {};
      jobsSnapshot.docs.forEach((d) => {
        const pid = d.data().employerId;
        if (pid) countMap[pid] = (countMap[pid] || 0) + 1;
      });

      const merged = data.map((e) => ({
        ...e,
        jobsCount: countMap[e.uid] || 0
      }));

      setEmployers(merged);
      setFilteredEmployers(merged);
    } catch (error) {
      console.log("Error loading employers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (employer) => {
    setSelectedEmployer(employer);
    setViewOpen(true);
  };

  const stats = useMemo(() => ({ total: employers.length }), [employers]);

  const handleExportCsv = () => {
    const rows = filteredEmployers.map((e) => ({
      name: e.name || "",
      email: e.email || "",
      phone: e.phone || "",
      jobsCount: e.jobsCount ?? 0,
      uid: e.uid || ""
    }));

    exportToCsv("employers", rows, [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "jobsCount", label: "Jobs Posted" },
      { key: "uid", label: "UID" }
    ]);
  };

  const columns = [
    {
      field: "name",
      headerName: "Name",
      flex: 1.3,
      minWidth: 200,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.3} alignItems="center" sx={{ height: "100%" }}>
          <UserAvatar name={params.value} photoUrl={params.row.photoUrl} tone="secondary" />
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
      field: "jobsCount",
      headerName: "Jobs Posted",
      flex: 0.8,
      minWidth: 130,
      renderCell: (params) => (
        <Chip
          label={params.value ?? 0}
          size="small"
          sx={{
            bgcolor: "rgba(6,182,212,0.12)",
            color: "info.main",
            border: "1px solid rgba(6,182,212,0.22)",
            fontWeight: 700
          }}
        />
      )
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 90,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Tooltip title="View details">
          <IconButton
            onClick={() => handleView(params.row)}
            size="small"
            sx={{
              color: "secondary.main",
              transition: "transform 0.15s ease, background-color 0.15s ease",
              "&:hover": { bgcolor: "rgba(168,85,247,0.14)", transform: "scale(1.12)" }
            }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
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

          <Box sx={{ display: "flex", gap: 1.5, mt: 2.5, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
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
            <Button
              variant="outlined"
              startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
              onClick={handleExportCsv}
              sx={{
                textTransform: "none",
                borderRadius: 2.5,
                fontWeight: 700,
                borderColor: "divider",
                color: "text.primary",
                transition: "border-color 0.15s ease, transform 0.15s ease",
                "&:hover": { borderColor: "secondary.main", transform: "scale(1.03)" }
              }}
            >
              Export CSV
            </Button>
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

      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        fullWidth
        maxWidth="sm"
        TransitionComponent={Fade}
        transitionDuration={220}
        PaperProps={{
          sx: { backgroundColor: "#0D1220", color: "#fff", border: "1px solid", borderColor: "divider", borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Employer Details</DialogTitle>
        <DialogContent>
          <Divider sx={{ borderColor: "divider", mb: 2 }} />
          {selectedEmployer && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <UserAvatar name={selectedEmployer.name} photoUrl={selectedEmployer.photoUrl} size={48} tone="secondary" />
                <Box>
                  <Typography fontWeight={700}>{selectedEmployer.name || "-"}</Typography>
                  <Typography fontSize={13} color="text.secondary">{selectedEmployer.role || "Employer"}</Typography>
                </Box>
              </Stack>
              <Typography><b>Email:</b> {selectedEmployer.email || "-"}</Typography>
              <Typography><b>Phone:</b> {selectedEmployer.phone || "-"}</Typography>
              <Typography><b>Jobs Posted:</b> {selectedEmployer.jobsCount ?? 0}</Typography>
              <Typography><b>Last Active:</b> {formatTime(selectedEmployer.lastSeen)}</Typography>
              <Typography><b>Joined:</b> {formatTime(selectedEmployer.createdAt)}</Typography>
              <Typography sx={{ wordBreak: "break-word" }}><b>UID:</b> {selectedEmployer.uid || "-"}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setViewOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Employers;
