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
  Fade,
  Select,
  MenuItem,
  Fab,
  Grow
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CloseIcon from "@mui/icons-material/Close";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, deleteDoc, doc, writeBatch, getDoc, addDoc } from "firebase/firestore";

import { db, auth } from "../firebase/firebase";
import { exportToCsv } from "../utils/exportCsv";
import UserAvatar from "../components/UserAvatar";

// Update this once the backend is deployed on Render (Phase 7).
// For now it points at the local Node/Express server.
const API_BASE_URL = "https://jobmatrix-backend-cd5v.onrender.com";

const STATUS_OPTIONS = ["Applied", "In Review", "Shortlisted", "Rejected"];

const STATUS_MESSAGES = {
  "In Review": (job, company) => `Your application for ${job} at ${company} is now under review.`,
  Shortlisted: (job, company) => `Great news! You've been shortlisted for ${job} at ${company}.`,
  Rejected: (job, company) => `Your application for ${job} at ${company} was not selected this time.`,
  Applied: (job, company) => `Your application status for ${job} at ${company} was updated to Applied.`
};

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

function statusColor(status) {
  const s = (status || "Applied").toLowerCase();
  if (s === "shortlisted") return { color: "#22C55E", bg: "rgba(34,197,94,0.14)" };
  if (s === "rejected") return { color: "#EF4444", bg: "rgba(239,68,68,0.14)" };
  if (s === "in review") return { color: "#06B6D4", bg: "rgba(6,182,212,0.14)" };
  return { color: "#F59E0B", bg: "rgba(245,158,11,0.14)" }; // Applied
}

function Applications() {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [resumeLoadingId, setResumeLoadingId] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [selectionModel, setSelectionModel] = useState([]);
  const [gridKey, setGridKey] = useState(0);
  const [bulkStatus, setBulkStatus] = useState("Shortlisted");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // DataGrid's selection model shape differs across @mui/x-data-grid versions
  // (plain array in v6, {type, ids: Set} in v7+) — normalize either into an array.
  const normalizeSelection = (model) => {
    if (Array.isArray(model)) return model;
    if (model && model.ids) return Array.from(model.ids);
    return [];
  };

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    const value = search.toLowerCase().trim();

    const filtered = applications.filter((application) => {
      const jobTitle = (application.jobTitle || "").toLowerCase();
      const companyName = (application.companyName || "").toLowerCase();
      const studentName = (application.studentName || "").toLowerCase();
      const status = (application.status || "").toLowerCase();
      const applicationId = (application.applicationId || "").toLowerCase();

      return (
        jobTitle.includes(value) ||
        companyName.includes(value) ||
        studentName.includes(value) ||
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

      // Resolve student name/photo once per unique studentId.
      const uniqueIds = [...new Set(data.map((a) => a.studentId).filter(Boolean))];
      const studentMap = {};
      await Promise.all(
        uniqueIds.map(async (sid) => {
          try {
            const userSnap = await getDoc(doc(db, "users", sid));
            studentMap[sid] = userSnap.exists() ? userSnap.data() : null;
          } catch {
            studentMap[sid] = null;
          }
        })
      );

      const enriched = data.map((a) => ({
        ...a,
        studentName: a.studentId ? studentMap[a.studentId]?.name || a.studentId : "Unknown",
        studentPhotoUrl: a.studentId ? studentMap[a.studentId]?.photoUrl : null
      }));

      setApplications(enriched);
      setFilteredApplications(enriched);
    } catch (error) {
      console.log("Error loading applications:", error);
    } finally {
      setLoading(false);
    }
  };

  // resumeLink now stores the B2 file key, not a direct URL. A fresh signed
  // URL must be fetched from the backend right before opening.
  const handleOpenResume = async (row) => {
    const key = row.resumeLink;
    if (!key) return;

    setResumeLoadingId(row.id);
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("Not logged in");
        return;
      }
      const token = await user.getIdToken(true);

      const res = await fetch(`${API_BASE_URL}/resume/${key}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to fetch resume URL");

      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.log("Error opening resume:", error);
    } finally {
      setResumeLoadingId(null);
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
          const studentName = (application.studentName || "").toLowerCase();
          const status = (application.status || "").toLowerCase();
          const applicationId = (application.applicationId || "").toLowerCase();
          return (
            jobTitle.includes(value) ||
            companyName.includes(value) ||
            studentName.includes(value) ||
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

  // Phase 3 — Bulk Actions: update status on every selected application in
  // a single atomic Firestore batch write (max 500 per batch, safely under
  // any realistic selection size here).
  const handleBulkStatusUpdate = async () => {
    if (selectionModel.length === 0) return;

    setBulkUpdating(true);
    try {
      const targets = applications.filter((app) => selectionModel.includes(app.id));

      const batch = writeBatch(db);
      targets.forEach((app) => {
        batch.update(doc(db, "applications", app.id), { status: bulkStatus });
      });
      await batch.commit();

      setApplications((prev) =>
        prev.map((app) =>
          selectionModel.includes(app.id) ? { ...app, status: bulkStatus } : app
        )
      );
      setFilteredApplications((prev) =>
        prev.map((app) =>
          selectionModel.includes(app.id) ? { ...app, status: bulkStatus } : app
        )
      );
      setSelectionModel([]);
      setGridKey((k) => k + 1);

      // Fire student push notifications in the background — a notification
      // failure should never block or roll back the status update itself.
      notifyStudentsOfStatusChange(targets, bulkStatus);
    } catch (error) {
      console.log("Bulk status update error:", error);
    } finally {
      setBulkUpdating(false);
    }
  };

  const notifyStudentsOfStatusChange = async (targets, status) => {
    const messageFor = STATUS_MESSAGES[status] || STATUS_MESSAGES.Applied;

    await Promise.allSettled(
      targets.map(async (app) => {
        if (!app.studentId) return;

        const message = messageFor(app.jobTitle || "the job", app.companyName || "the company");

        try {
          // Write the same Firestore notification doc the employer-triggered
          // flow creates, so it also appears on the student's in-app
          // notification screen (not just the push tray).
          await addDoc(collection(db, "notifications"), {
            recipientId: app.studentId,
            studentId: app.studentId,
            jobId: app.jobId || "",
            jobTitle: app.jobTitle || "",
            companyName: app.companyName || "",
            message,
            type: "StatusUpdate",
            isRead: false,
            createdAt: Date.now()
          });
        } catch (error) {
          console.log("Create notification doc error:", error);
        }

        try {
          const userSnap = await getDoc(doc(db, "users", app.studentId));
          const token = userSnap.exists() ? userSnap.data().fcmToken : null;
          if (!token) return;

          await fetch(`${API_BASE_URL}/send-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              title: "Application Update",
              body: message,
              applicationId: app.id,
              type: "StatusUpdate"
            })
          });
        } catch (error) {
          console.log("Notify student error:", error);
        }
      })
    );
  };

  // Phase 3 — CSV Export
  const handleExportCsv = () => {
    const rows = filteredApplications.map((a) => ({
      jobTitle: a.jobTitle || "",
      companyName: a.companyName || "",
      studentName: a.studentName || "",
      studentId: a.studentId || "",
      status: a.status || "Applied",
      appliedAt: formatTime(a.appliedAt),
      applicationId: a.applicationId || a.id
    }));

    exportToCsv("applications", rows, [
      { key: "jobTitle", label: "Job Title" },
      { key: "companyName", label: "Company" },
      { key: "studentName", label: "Student" },
      { key: "studentId", label: "Student ID" },
      { key: "status", label: "Status" },
      { key: "appliedAt", label: "Applied At" },
      { key: "applicationId", label: "Application ID" }
    ]);
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
      field: "studentName",
      headerName: "Student",
      flex: 1.3,
      minWidth: 200,
      renderCell: (params) => (
        <Tooltip title={params.row.studentId || "-"}>
          <Stack direction="row" spacing={1.3} alignItems="center" sx={{ height: "100%" }}>
            <UserAvatar name={params.value} photoUrl={params.row.studentPhotoUrl} size={30} tone="primary" />
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>
              {params.value || "Unknown"}
            </Typography>
          </Stack>
        </Tooltip>
      )
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.9,
      minWidth: 140,
      renderCell: (params) => {
        const { color, bg } = statusColor(params.value);

        return (
          <Chip
            label={params.value || "Applied"}
            size="small"
            sx={{
              color,
              bgcolor: bg,
              border: `1px solid ${color}33`,
              fontWeight: 700,
              ...((params.value || "").toLowerCase() === "shortlisted" && {
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
            startIcon={
              resumeLoadingId === params.row.id ? (
                <CircularProgress size={14} sx={{ color: "#fff" }} />
              ) : (
                <DescriptionIcon sx={{ fontSize: 16 }} />
              )
            }
            disabled={resumeLoadingId === params.row.id}
            onClick={() => handleOpenResume(params.row)}
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
            {resumeLoadingId === params.row.id ? "Opening..." : "Open Resume"}
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

            <Stack direction="row" spacing={1.5} alignItems="center">
              <AssignmentIcon sx={{ fontSize: 50, color: "warning.main" }} />
            </Stack>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 2.5, alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
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
                "&:hover": { borderColor: "warning.main", transform: "scale(1.03)" }
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
                key={gridKey}
                rows={filteredApplications}
                columns={columns}
                checkboxSelection
                disableRowSelectionOnClick
                onRowSelectionModelChange={(model) => setSelectionModel(normalizeSelection(model))}
                pageSizeOptions={[5, 10, 20, 50]}
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

      {/* Phase 3 — Bulk Actions floating bar, slides in only when rows are selected */}
      <Grow in={selectionModel.length > 0} unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2.5,
            py: 1.3,
            borderRadius: 4,
            backgroundColor: "#0D1220",
            border: "1px solid",
            borderColor: "rgba(99,102,241,0.35)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)"
          }}
        >
          <Chip
            label={`${selectionModel.length} selected`}
            size="small"
            sx={{
              bgcolor: "rgba(99,102,241,0.15)",
              color: "primary.light",
              border: "1px solid rgba(99,102,241,0.3)",
              fontWeight: 700
            }}
          />

          <Select
            size="small"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            sx={{
              minWidth: 140,
              color: "#fff",
              backgroundColor: "#151B2E",
              borderRadius: 2,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#2A3447" }
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>

          <Button
            variant="contained"
            size="small"
            disabled={bulkUpdating}
            startIcon={
              bulkUpdating ? (
                <CircularProgress size={14} sx={{ color: "#fff" }} />
              ) : (
                <DoneAllIcon sx={{ fontSize: 16 }} />
              )
            }
            onClick={handleBulkStatusUpdate}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              fontWeight: 700,
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" }
            }}
          >
            {bulkUpdating ? "Updating..." : "Apply"}
          </Button>

          <Tooltip title="Clear selection">
            <IconButton
              size="small"
              onClick={() => {
                setSelectionModel([]);
                setGridKey((k) => k + 1);
              }}
              sx={{ color: "text.secondary", "&:hover": { color: "#fff" } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Grow>

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
