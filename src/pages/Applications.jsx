import { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, TextField, InputAdornment, CircularProgress,
  Chip, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Fade, Select, MenuItem, Grow, Grid, Skeleton
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import SearchIcon from "@mui/icons-material/Search";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CloseIcon from "@mui/icons-material/Close";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import BlockIcon from "@mui/icons-material/Block";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, deleteDoc, doc, writeBatch, getDoc, addDoc } from "firebase/firestore";

import { db, auth } from "../firebase/firebase";
import { exportToCsv } from "../utils/exportCsv";
import UserAvatar from "../components/UserAvatar";

const API_BASE_URL = "https://jobmatrix-backend-cd5v.onrender.com";

// Fixed px radii so the global theme borderRadius (18) does not inflate shapes
const R = { card: "14px", tile: "10px", pill: "12px" };

const STATUS_OPTIONS = ["Applied", "In Review", "Shortlisted", "Rejected"];

const STATUS_MESSAGES = {
  "In Review": (job, company) => `Your application for ${job} at ${company} is now under review.`,
  Shortlisted: (job, company) => `Great news! You've been shortlisted for ${job} at ${company}.`,
  Rejected: (job, company) => `Your application for ${job} at ${company} was not selected this time.`,
  Applied: (job, company) => `Your application status for ${job} at ${company} was updated to Applied.`
};

const FILTERS = [{ key: "all", label: "All" }].concat(
  STATUS_OPTIONS.map((s) => ({ key: s.toLowerCase(), label: s }))
);

const STATUS_COLORS = {
  applied: "#F59E0B",
  "in review": "#06B6D4",
  shortlisted: "#22C55E",
  rejected: "#EF4444"
};
const statusColor = (s) => STATUS_COLORS[(s || "Applied").toLowerCase()] || "#94A3B8";

const getTimeValue = (v) => {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};
const formatTime = (v) => (getTimeValue(v) ? new Date(getTimeValue(v)).toLocaleString() : "");

function StatusChip({ label }) {
  const c = statusColor(label);
  const live = (label || "").toLowerCase() === "shortlisted";
  return (
    <Chip
      size="small"
      label={label || "Applied"}
      sx={{
        borderRadius: R.pill,
        color: c,
        bgcolor: alpha(c, 0.14),
        border: `1px solid ${alpha(c, 0.3)}`,
        fontWeight: 700,
        ...(live && {
          "&::before": {
            content: '""', display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            bgcolor: c, ml: 0.8, mr: -0.2, animation: "pulseDot 1.8s infinite"
          }
        })
      }}
    />
  );
}

// Dashboard-style glow stat card
function StatCard({ label, value, sub, subDot, color, icon, loading, delay = 0 }) {
  return (
    <Card
      sx={{
        borderRadius: R.card,
        background: (t) => `linear-gradient(135deg, ${alpha(color, 0.15)} 0%, ${t.palette.background.paper} 65%)`,
        border: `1px solid ${alpha(color, 0.33)}`,
        boxShadow: `0 0 22px ${alpha(color, 0.12)}`,
        position: "relative",
        overflow: "hidden",
        animation: "fadeUp 0.4s ease",
        animationDelay: `${delay}s`,
        animationFillMode: "backwards",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        "&:hover": { transform: "translateY(-4px)", boxShadow: `0 0 30px ${alpha(color, 0.25)}` }
      }}
    >
      <CardContent sx={{ p: 2.25, display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 52, height: 52, borderRadius: R.tile, flexShrink: 0, color,
            bgcolor: alpha(color, 0.13), border: `1px solid ${alpha(color, 0.33)}`,
            boxShadow: `0 0 16px ${alpha(color, 0.2)}`,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{label}</Typography>
          {loading ? (
            <Skeleton variant="text" width={56} height={36} sx={{ transform: "none" }} />
          ) : (
            <Typography sx={{ color: "text.primary", fontWeight: 700, fontSize: 28, lineHeight: 1.2 }}>
              {value}
            </Typography>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            {subDot ? (
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: color }} />
            ) : (
              <TrendingUpIcon sx={{ color, fontSize: 14 }} />
            )}
            <Typography sx={{ color: "text.secondary", fontWeight: 500, fontSize: 12 }}>{sub}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

const dialogPaper = {
  sx: { bgcolor: "background.paper", backgroundImage: "none", border: "1px solid", borderColor: "divider", borderRadius: R.card }
};

function Applications() {
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [resumeLoadingId, setResumeLoadingId] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [selectionModel, setSelectionModel] = useState([]);
  const [gridKey, setGridKey] = useState(0);
  const [bulkStatus, setBulkStatus] = useState("Shortlisted");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // DataGrid's selection model shape differs across versions (array in v6,
  // {type, ids: Set} in v7+) - normalize either into an array.
  const normalizeSelection = (model) => {
    if (Array.isArray(model)) return model;
    if (model && model.ids) return Array.from(model.ids);
    return [];
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // Selection must never silently include rows the admin can no longer see
  useEffect(() => {
    if (selectionModel.length > 0) {
      setSelectionModel([]);
      setGridKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter]);

  const loadApplications = async () => {
    try {
      const snapshot = await getDocs(collection(db, "applications"));
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => getTimeValue(b.appliedAt) - getTimeValue(a.appliedAt));

      // Resolve student name/photo once per unique studentId
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

      setApplications(
        data.map((a) => ({
          ...a,
          studentName: a.studentId ? studentMap[a.studentId]?.name || a.studentId : "Unknown",
          studentPhotoUrl: a.studentId ? studentMap[a.studentId]?.photoUrl : null
        }))
      );
    } catch (error) {
      console.log("Error loading applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = useMemo(() => {
    const v = search.toLowerCase().trim();
    return applications.filter((a) => {
      const status = (a.status || "Applied").toLowerCase();
      if (filter !== "all" && status !== filter) return false;
      if (!v) return true;
      return [a.jobTitle, a.companyName, a.studentName, status, a.applicationId].some((f) =>
        String(f || "").toLowerCase().includes(v)
      );
    });
  }, [applications, search, filter]);

  const stats = useMemo(() => {
    const st = (a) => (a.status || "Applied").toLowerCase();
    return {
      total: applications.length,
      applied: applications.filter((a) => st(a) === "applied").length,
      review: applications.filter((a) => st(a) === "in review").length,
      shortlisted: applications.filter((a) => st(a) === "shortlisted").length,
      rejected: applications.filter((a) => st(a) === "rejected").length
    };
  }, [applications]);

  // resumeLink stores the B2 file key, not a URL. Fetch a fresh signed URL first.
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
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.log("Error opening resume:", error);
    } finally {
      setResumeLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "applications", deleteTarget.id));
      setApplications((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.log("Delete application error:", error);
    } finally {
      setDeleting(false);
    }
  };

  // Bulk status update in one atomic Firestore batch
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
        prev.map((app) => (selectionModel.includes(app.id) ? { ...app, status: bulkStatus } : app))
      );
      setSelectionModel([]);
      setGridKey((k) => k + 1);

      // Notifications run in the background; a failure never rolls back the update
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
          // Same notification doc the employer flow creates, so it shows in-app too
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

  const columns = [
    {
      field: "jobTitle",
      headerName: "Job",
      flex: 1.6,
      minWidth: 260,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, height: "100%" }}>
          <UserAvatar name={p.row.companyName || p.row.jobTitle} size={36} tone="primary" />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", lineHeight: 1.3 }}>
              {p.row.jobTitle || "-"}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.3 }}>
              {p.row.companyName || "-"}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      field: "studentName",
      headerName: "Student",
      flex: 1.3,
      minWidth: 210,
      renderCell: (p) => (
        <Tooltip title={p.row.studentId || "-"}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, height: "100%", minWidth: 0 }}>
            <UserAvatar name={p.value} photoUrl={p.row.studentPhotoUrl} size={34} tone="primary" />
            <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>
              {p.value || "Unknown"}
            </Typography>
          </Box>
        </Tooltip>
      )
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 140,
      renderCell: (p) => <StatusChip label={p.value} />
    },
    {
      field: "resumeLink",
      headerName: "Resume",
      flex: 0.9,
      minWidth: 160,
      sortable: false,
      renderCell: (p) => {
        if (!p.value) {
          return <Typography sx={{ color: "text.secondary", fontSize: 13 }}>No resume</Typography>;
        }
        const busy = resumeLoadingId === p.row.id;
        return (
          <Button
            size="small"
            variant="outlined"
            disabled={busy}
            onClick={() => handleOpenResume(p.row)}
            startIcon={
              busy ? <CircularProgress size={14} color="inherit" /> : <DescriptionIcon sx={{ fontSize: 16 }} />
            }
            sx={{
              textTransform: "none",
              borderRadius: R.tile,
              fontWeight: 700,
              color: "primary.light",
              bgcolor: alpha("#6366F1", 0.12),
              borderColor: alpha("#6366F1", 0.35),
              transition: "background-color 0.15s ease, transform 0.15s ease",
              "&:hover": { bgcolor: alpha("#6366F1", 0.22), borderColor: "#6366F1", transform: "scale(1.03)" }
            }}
          >
            {busy ? "Opening..." : "Open resume"}
          </Button>
        );
      }
    },
    {
      field: "appliedAt",
      headerName: "Applied",
      flex: 1,
      minWidth: 170,
      valueGetter: (value, row) => getTimeValue(row.appliedAt),
      renderCell: (p) => (
        <Typography sx={{ fontSize: 13.5, color: "text.primary" }}>{formatTime(p.row.appliedAt) || "-"}</Typography>
      )
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Tooltip title="Delete application">
          <IconButton
            size="small"
            onClick={() => setDeleteTarget(p.row)}
            sx={{
              color: "#EF4444",
              borderRadius: R.tile,
              transition: "transform 0.15s ease, background-color 0.15s ease",
              "&:hover": { bgcolor: alpha("#EF4444", 0.14), transform: "scale(1.12)" }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  const pct = (n) => (stats.total ? Math.round((n / stats.total) * 100) : 0);

  return (
    <Box sx={{ width: "100%", maxWidth: "1600px" }}>
      {/* Header */}
      <Card
        sx={{
          mb: 4,
          borderRadius: R.card,
          background: (t) =>
            `linear-gradient(135deg, ${alpha(t.palette.background.paper, 0.9)} 0%, ${alpha(t.palette.background.default, 0.9)} 100%)`,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 14px 32px rgba(0,0,0,0.2)",
          backdropFilter: "blur(16px)",
          animation: "fadeUp 0.4s ease",
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            top: -60, right: -60, width: 220, height: 220, borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha("#F59E0B", 0.18)}, transparent 70%)`,
            pointerEvents: "none"
          }
        }}
      >
        <CardContent sx={{ px: { xs: 3, md: 4.5 }, py: 3.75, position: "relative", zIndex: 1 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "flex-start", md: "center" },
              justifyContent: "space-between",
              gap: 2.5
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: "primary.light", letterSpacing: "0.14em", fontWeight: 600 }}>
                JobMatrix Admin Panel
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: "text.primary", mt: 0.5 }}>
                Applications
              </Typography>
              <Typography sx={{ color: "text.secondary", mt: 1, lineHeight: 1.7, fontSize: 14.5 }}>
                Track every student application and update statuses in bulk.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "flex-start", md: "flex-end" }, gap: 1, flexShrink: 0 }}>
              <Chip
                icon={
                  <Box
                    sx={{
                      width: 8, height: 8, borderRadius: "50%", ml: 1.25,
                      bgcolor: loading ? "#F59E0B" : "#22C55E",
                      animation: loading ? "none" : "pulseDot 1.8s ease-in-out infinite"
                    }}
                  />
                }
                label={loading ? "Syncing..." : "Live Firebase Data"}
                sx={{
                  borderRadius: R.pill, px: 1, fontWeight: 600, color: "primary.light",
                  bgcolor: alpha("#6366F1", 0.12), border: `1px solid ${alpha("#6366F1", 0.22)}`,
                  "& .MuiChip-icon": { order: -1 }
                }}
              />
              <Button
                variant="outlined"
                startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
                onClick={handleExportCsv}
                sx={{
                  textTransform: "none",
                  borderRadius: R.pill,
                  fontWeight: 600,
                  px: 2.25,
                  borderColor: alpha("#F59E0B", 0.4),
                  color: "warning.main",
                  bgcolor: alpha("#F59E0B", 0.1),
                  "&:hover": { borderColor: "#F59E0B", bgcolor: alpha("#F59E0B", 0.18) }
                }}
              >
                Export CSV
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <Grid container spacing={3} sx={{ mb: 3.5 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total Applications" value={stats.total} sub="All submissions" color="#6366F1" icon={<AssignmentIcon sx={{ fontSize: 28 }} />} loading={loading} delay={0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Awaiting Review" value={stats.applied} sub={`${stats.review} in review`} subDot color="#F59E0B" icon={<PendingActionsIcon sx={{ fontSize: 28 }} />} loading={loading} delay={0.07} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Shortlisted" value={stats.shortlisted} sub={`${pct(stats.shortlisted)}% of all`} subDot color="#22C55E" icon={<TaskAltIcon sx={{ fontSize: 28 }} />} loading={loading} delay={0.14} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Rejected" value={stats.rejected} sub={`${pct(stats.rejected)}% of all`} subDot color="#EF4444" icon={<BlockIcon sx={{ fontSize: 28 }} />} loading={loading} delay={0.21} />
        </Grid>
      </Grid>

      {/* Table card */}
      <Card
        sx={{
          borderRadius: R.card,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
          animation: "fadeUp 0.5s ease both",
          animationDelay: "0.1s"
        }}
      >
        <CardContent sx={{ p: 3.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: "text.primary", fontSize: 17 }}>
              All Applications
            </Typography>
            <Chip
              size="small"
              label={`${filteredApplications.length} shown`}
              sx={{
                borderRadius: R.pill, height: 24, fontWeight: 600, color: "#F59E0B",
                bgcolor: alpha("#F59E0B", 0.1), border: `1px solid ${alpha("#F59E0B", 0.2)}`
              }}
            />
          </Box>

          <Divider sx={{ my: 2.25 }} />

          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 3 }}>
            <TextField
              placeholder="Search job, company, student, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                flex: "1 1 280px",
                "& .MuiOutlinedInput-root": {
                  bgcolor: "transparent",
                  borderRadius: R.tile,
                  transition: "box-shadow 0.2s ease",
                  "&.Mui-focused fieldset": { borderColor: "warning.main" },
                  "&.Mui-focused": { boxShadow: `0 0 0 3px ${alpha("#F59E0B", 0.18)}` }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                )
              }}
            />
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {FILTERS.map((f) => {
                const on = filter === f.key;
                const c = f.key === "all" ? "#F59E0B" : statusColor(f.label);
                return (
                  <Chip
                    key={f.key}
                    label={f.label}
                    onClick={() => setFilter(f.key)}
                    sx={{
                      borderRadius: R.pill,
                      fontWeight: 700,
                      color: on ? c : "text.secondary",
                      bgcolor: on ? alpha(c, 0.14) : "transparent",
                      border: "1px solid",
                      borderColor: on ? alpha(c, 0.4) : "divider",
                      boxShadow: on ? `0 0 14px ${alpha(c, 0.2)}` : "none",
                      transition: "all 0.15s ease"
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {loading ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1.5} py={6}>
              <CircularProgress sx={{ color: "warning.main" }} />
              <Typography color="text.secondary" fontSize={13}>Loading applications...</Typography>
            </Box>
          ) : filteredApplications.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={8}>
              <AssignmentIcon sx={{ fontSize: 42, color: "text.secondary", opacity: 0.5 }} />
              <Typography color="text.secondary">No applications found.</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                height: 650, width: "100%", animation: "fadeIn 0.4s ease",
                border: "1px solid", borderColor: "divider", borderRadius: R.tile, overflow: "hidden"
              }}
            >
              <DataGrid
                key={gridKey}
                rows={filteredApplications}
                columns={columns}
                rowHeight={64}
                checkboxSelection
                disableRowSelectionOnClick
                onRowSelectionModelChange={(model) => setSelectionModel(normalizeSelection(model))}
                pageSizeOptions={[5, 10, 20, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                sx={{
                  border: 0,
                  borderRadius: 0,
                  color: "text.primary",
                  backgroundColor: "transparent",
                  "--DataGrid-containerBackground": "transparent",
                  "--DataGrid-pinnedBackground": "transparent",
                  "& .MuiDataGrid-main, & .MuiDataGrid-virtualScroller, & .MuiDataGrid-virtualScrollerContent": {
                    backgroundColor: "transparent"
                  },
                  "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeader, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller": {
                    backgroundColor: "transparent"
                  },
                  "& .MuiDataGrid-columnHeaders": { borderBottom: "1px solid", borderColor: "divider" },
                  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700, fontSize: 13 },
                  "& .MuiDataGrid-cell": { borderColor: "divider", display: "flex", alignItems: "center" },
                  "& .MuiDataGrid-row": {
                    backgroundColor: "transparent",
                    transition: "background-color 0.15s ease",
                    "&:hover": { backgroundColor: (t) => alpha(t.palette.text.primary, 0.04) },
                    "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: alpha("#F59E0B", 0.08) }
                  },
                  "& .MuiCheckbox-root": { color: "text.secondary" },
                  "& .MuiCheckbox-root.Mui-checked, & .MuiCheckbox-root.MuiCheckbox-indeterminate": { color: "warning.main" },
                  "& .MuiDataGrid-footerContainer": { backgroundColor: "transparent", borderColor: "divider" },
                  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Bulk action bar */}
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
            borderRadius: R.card,
            bgcolor: "background.paper",
            border: `1px solid ${alpha("#6366F1", 0.4)}`,
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)"
          }}
        >
          <Chip
            label={`${selectionModel.length} selected`}
            size="small"
            sx={{
              borderRadius: R.pill, fontWeight: 700, color: "primary.light",
              bgcolor: alpha("#6366F1", 0.15), border: `1px solid ${alpha("#6366F1", 0.3)}`
            }}
          />

          <Select
            size="small"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            sx={{
              minWidth: 150,
              borderRadius: R.tile,
              bgcolor: "background.default",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" }
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: statusColor(s) }} />
                  {s}
                </Box>
              </MenuItem>
            ))}
          </Select>

          <Button
            variant="contained"
            size="small"
            disabled={bulkUpdating}
            startIcon={
              bulkUpdating ? <CircularProgress size={14} color="inherit" /> : <DoneAllIcon sx={{ fontSize: 16 }} />
            }
            onClick={handleBulkStatusUpdate}
            sx={{ textTransform: "none", borderRadius: R.tile, fontWeight: 700, boxShadow: "none" }}
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
              sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Grow>

      {/* Delete dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
        TransitionComponent={Fade}
        transitionDuration={220}
        PaperProps={dialogPaper}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Application</DialogTitle>
        <DialogContent>
          <Divider sx={{ mb: 2 }} />
          <Typography>
            Delete the application for <b>{deleteTarget?.jobTitle || "this job"}</b>
            {deleteTarget?.companyName ? ` at ${deleteTarget.companyName}` : ""}
            {deleteTarget?.studentName ? ` by ${deleteTarget.studentName}` : ""}?
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary" }}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            variant="outlined"
            color="inherit"
            disabled={deleting}
            sx={{ borderRadius: R.tile }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            disabled={deleting}
            sx={{ borderRadius: R.tile, bgcolor: "#EF4444", "&:hover": { bgcolor: "#DC2626" } }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Applications;
