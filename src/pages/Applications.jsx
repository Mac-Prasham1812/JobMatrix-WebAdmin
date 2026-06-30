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
  Button,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Fade
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

import { db } from "../firebase/firebase";

function formatTime(value) {
  if (!value) return "";
  if (typeof value?.toMillis === "function") {
    return new Date(value.toMillis()).toLocaleString();
  }
  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000).toLocaleString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function getTimeValue(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

function Applications() {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    const value = search.toLowerCase().trim();

    const filtered = applications.filter((application) => {
      const jobTitle = (application.jobTitle || "").toLowerCase();
      const companyName = (application.companyName || "").toLowerCase();
      const studentId = (application.studentId || "").toLowerCase();
      const status = (application.status || "").toLowerCase();
      const applicationId = (application.applicationId || "").toLowerCase();

      return (
        jobTitle.includes(value) ||
        companyName.includes(value) ||
        studentId.includes(value) ||
        status.includes(value) ||
        applicationId.includes(value)
      );
    });

    setFilteredApplications(filtered);
  }, [search, applications]);

  const loadApplications = async () => {
    try {
      const snapshot = await getDocs(collection(db, "applications"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      data.sort(
        (a, b) => getTimeValue(b.appliedAt) - getTimeValue(a.appliedAt)
      );

      setApplications(data);
      setFilteredApplications(data);
    } catch (error) {
      console.log("Error loading applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (application) => {
    setDeleteTarget(application);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "applications", deleteTarget.id));

      const updated = applications.filter((a) => a.id !== deleteTarget.id);
      setApplications(updated);
      setFilteredApplications(
        updated.filter((application) => {
          const value = search.toLowerCase().trim();
          const jobTitle = (application.jobTitle || "").toLowerCase();
          const companyName = (application.companyName || "").toLowerCase();
          const studentId = (application.studentId || "").toLowerCase();
          const status = (application.status || "").toLowerCase();
          const applicationId = (application.applicationId || "").toLowerCase();
          return (
            jobTitle.includes(value) ||
            companyName.includes(value) ||
            studentId.includes(value) ||
            status.includes(value) ||
            applicationId.includes(value)
          );
        })
      );

      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.log("Delete application error:", error);
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const applied = applications.filter(
      (app) => (app.status || "Applied").toLowerCase() === "applied"
    ).length;

    const shortlisted = applications.filter(
      (app) => (app.status || "").toLowerCase() === "shortlisted"
    ).length;

    const rejected = applications.filter(
      (app) => (app.status || "").toLowerCase() === "rejected"
    ).length;

    return {
      applied,
      shortlisted,
      rejected,
      total: applications.length
    };
  }, [applications]);

  const columns = [
    {
      field: "jobTitle",
      headerName: "Job Title",
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
              bgcolor: "rgba(245,158,11,0.16)",
              color: "warning.main",
              border: "1px solid rgba(245,158,11,0.3)"
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
      field: "companyName",
      headerName: "Company",
      flex: 1.2,
      minWidth: 160
    },
    {
      field: "studentId",
      headerName: "Student ID",
      flex: 1.3,
      minWidth: 180
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.9,
      minWidth: 130,
      renderCell: (params) => {
        const status = (params.value || "Applied").toLowerCase();

        let chipColor = "#94A3B8";
        let chipBg = "rgba(148,163,184,0.12)";

        if (status === "applied") {
          chipColor = "#F59E0B";
          chipBg = "rgba(245,158,11,0.14)";
        } else if (status === "shortlisted") {
          chipColor = "#22C55E";
          chipBg = "rgba(34,197,94,0.14)";
        } else if (status === "rejected") {
          chipColor = "#EF4444";
          chipBg = "rgba(239,68,68,0.14)";
        }

        return (
          <Chip
            label={params.value || "Applied"}
            size="small"
            sx={{
              color: chipColor,
              bgcolor: chipBg,
              border: `1px solid ${chipColor}33`,
              fontWeight: 700,
              ...(status === "shortlisted" && {
                "&::before": {
                  content: '""',
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: "#22C55E",
                  mr: 0.7,
                  animation: "pulseDot 1.8s infinite"
                }
              })
            }}
          />
        );
      }
    },
    {
      field: "resumeLink",
      headerName: "Resume",
      flex: 1,
      minWidth: 150,
      renderCell: (params) =>
        params.value ? (
          <Button
            variant="contained"
            size="small"
            startIcon={<DescriptionIcon sx={{ fontSize: 16 }} />}
            href={params.value}
            target="_blank"
            rel="noreferrer"
            sx={{
              textTransform: "none",
              borderRadius: 2,
              fontWeight: 700,
              bgcolor: "primary.main",
              transition: "background-color 0.15s ease, transform 0.15s ease",
              "&:hover": {
                bgcolor: "primary.dark",
                transform: "scale(1.04)"
              }
            }}
          >
            Open Resume
          </Button>
        ) : (
          <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
            No Resume
          </Typography>
        )
    },
    {
      field: "appliedAt",
      headerName: "Applied At",
      flex: 1.2,
      minWidth: 180,
      valueGetter: (value, row) => formatTime(row.appliedAt)
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 90,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Tooltip title="Delete application">
          <IconButton
            onClick={() => handleDeleteClick(params.row)}
            size="small"
            sx={{
              color: "#EF4444",
              transition: "transform 0.15s ease, background-color 0.15s ease",
              "&:hover": {
                bgcolor: "rgba(239,68,68,0.14)",
                transform: "scale(1.12)"
              }
            }}
          >
            <DeleteIcon fontSize="small" />
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
            background: "radial-gradient(circle, rgba(245,158,11,0.2), transparent 70%)",
            animation: "driftA 9s ease-in-out infinite",
            pointerEvents: "none"
          }}
        />
        <CardContent sx={{ p: 3, position: "relative" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} color="text.primary">
                Applications
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Manage all job applications from students.
              </Typography>
            </Box>

            <AssignmentIcon sx={{ fontSize: 50, color: "warning.main" }} />
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 2.5 }}>
            <Chip
              label={`Total: ${stats.total}`}
              sx={{
                bgcolor: "rgba(99,102,241,0.12)",
                color: "primary.light",
                border: "1px solid rgba(99,102,241,0.2)",
                fontWeight: 700
              }}
            />
            <Chip
              label={`Applied: ${stats.applied}`}
              sx={{
                bgcolor: "rgba(245,158,11,0.12)",
                color: "warning.main",
                border: "1px solid rgba(245,158,11,0.2)",
                fontWeight: 700
              }}
            />
            <Chip
              label={`Shortlisted: ${stats.shortlisted}`}
              sx={{
                bgcolor: "rgba(34,197,94,0.12)",
                color: "success.main",
                border: "1px solid rgba(34,197,94,0.2)",
                fontWeight: 700
              }}
            />
            <Chip
              label={`Rejected: ${stats.rejected}`}
              sx={{
                bgcolor: "rgba(239,68,68,0.12)",
                color: "#FCA5A5",
                border: "1px solid rgba(239,68,68,0.2)",
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
            placeholder="Search application..."
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
                "&.Mui-focused fieldset": { borderColor: "warning.main" },
                "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(245,158,11,0.18)" }
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
              <CircularProgress sx={{ color: "warning.main" }} />
              <Typography color="text.secondary" fontSize={13}>
                Loading applications...
              </Typography>
            </Box>
          ) : filteredApplications.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={8} sx={{ animation: "fadeIn 0.35s ease" }}>
              <AssignmentIcon sx={{ fontSize: 42, color: "text.secondary", opacity: 0.5 }} />
              <Typography color="text.secondary">No applications found.</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                height: 650,
                width: "100%",
                animation: "fadeIn 0.4s ease",
                "& .MuiDataGrid-root": { border: 0 }
              }}
            >
              <DataGrid
                rows={filteredApplications}
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
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        fullWidth
        maxWidth="xs"
        TransitionComponent={Fade}
        transitionDuration={220}
        PaperProps={{
          sx: {
            backgroundColor: "#0D1220",
            color: "#fff",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Application</DialogTitle>
        <DialogContent>
          <Divider sx={{ borderColor: "divider", mb: 2 }} />
          <Typography>
            Are you sure you want to delete the application for{" "}
            <b>{deleteTarget?.jobTitle || "this job"}</b>
            {deleteTarget?.companyName ? ` at ${deleteTarget.companyName}` : ""}?
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            variant="outlined"
            disabled={deleting}
            sx={{ borderColor: "divider", color: "#fff" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            disabled={deleting}
            sx={{
              bgcolor: "#EF4444",
              transition: "background-color 0.15s ease",
              "&:hover": { bgcolor: "#DC2626" }
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Applications;
