import { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, TextField, InputAdornment, CircularProgress,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Divider, Fade, Grid, Skeleton
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import WorkIcon from "@mui/icons-material/Work";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PeopleIcon from "@mui/icons-material/People";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import BlockIcon from "@mui/icons-material/Block";
import EventIcon from "@mui/icons-material/Event";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, deleteDoc, doc, query, where, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import UserAvatar from "../components/UserAvatar";

// Fixed px radii so the global theme borderRadius (18) does not inflate shapes
const R = { card: "14px", tile: "10px", pill: "12px" };

const toMillis = (v) => {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};
const fmtDate = (v) => (toMillis(v) ? new Date(toMillis(v)).toLocaleDateString() : "-");
const fmtDateTime = (v) => (toMillis(v) ? new Date(toMillis(v)).toLocaleString() : "-");

// % of the job's required skills the student already has
function computeMatch(jobSkills, studentSkills) {
  const job = (jobSkills || []).map((s) => String(s).toLowerCase().trim());
  const student = new Set((studentSkills || []).map((s) => String(s).toLowerCase().trim()));
  if (!job.length) return 0;
  return Math.round((job.filter((s) => student.has(s)).length / job.length) * 100);
}

const STATUS_COLORS = {
  active: "#22C55E", shortlisted: "#22C55E",
  closed: "#EF4444", rejected: "#EF4444",
  pending: "#F59E0B", "in review": "#F59E0B",
  applied: "#6366F1"
};
const statusColor = (s) => STATUS_COLORS[(s || "").toLowerCase()] || "#94A3B8";

function StatusChip({ label }) {
  const c = statusColor(label);
  const live = (label || "").toLowerCase() === "active";
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        borderRadius: R.pill,
        color: c, bgcolor: alpha(c, 0.14), border: `1px solid ${alpha(c, 0.3)}`, fontWeight: 700,
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

function InfoDialog({ open, onClose, title, icon, color, loading, empty, emptyText, children }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      TransitionComponent={Fade}
      transitionDuration={220}
      PaperProps={{
        sx: { bgcolor: "background.paper", backgroundImage: "none", border: "1px solid", borderColor: "divider", borderRadius: R.card }
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
        {icon}
        {title}
      </DialogTitle>
      <DialogContent>
        <Divider sx={{ mb: 2 }} />
        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1.5} py={5}>
            <CircularProgress size={28} sx={{ color }} />
            <Typography color="text.secondary" fontSize={13}>Loading...</Typography>
          </Box>
        ) : empty ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={6}>
            <PeopleIcon sx={{ fontSize: 38, color: "text.secondary", opacity: 0.5 }} />
            <Typography color="text.secondary">{emptyText}</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>{children}</Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: R.tile }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

const listRowSx = (i) => ({
  p: 1.5, borderRadius: R.tile, border: "1px solid", borderColor: "divider", bgcolor: "background.default",
  display: "flex", alignItems: "center", gap: 1.5,
  animation: "fadeUp 0.35s ease both", animationDelay: `${i * 0.05}s`
});

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" }
];

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [applicantsJob, setApplicantsJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  const [notifiedJob, setNotifiedJob] = useState(null);
  const [notifiedStudents, setNotifiedStudents] = useState([]);
  const [notifiedLoading, setNotifiedLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "jobs"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setJobs(data);
      } catch (e) {
        console.log("Error loading jobs:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const st = (j) => (j.status || "Active").toLowerCase();
    return {
      total: jobs.length,
      active: jobs.filter((j) => st(j) === "active").length,
      closed: jobs.filter((j) => st(j) === "closed").length,
      week: jobs.filter((j) => toMillis(j.createdAt) >= weekAgo).length
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const v = search.toLowerCase().trim();
    return jobs.filter((j) => {
      const status = (j.status || "Active").toLowerCase();
      if (filter !== "all" && status !== filter) return false;
      return [j.title, j.company, j.location, j.category, status, j.salary].some((f) =>
        String(f || "").toLowerCase().includes(v)
      );
    });
  }, [jobs, search, filter]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "jobs", deleteTarget.id));
      setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.log("Delete job error:", e);
    } finally {
      setDeleting(false);
    }
  };

  const fetchUsers = async (ids) => {
    const map = {};
    await Promise.all(
      ids.map(async (sid) => {
        try {
          const s = await getDoc(doc(db, "users", sid));
          map[sid] = s.exists() ? s.data() : null;
        } catch {
          map[sid] = null;
        }
      })
    );
    return map;
  };

  const handleViewApplicants = async (job) => {
    setApplicantsJob(job);
    setApplicantsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "applications"), where("jobId", "==", job.id)));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const users = await fetchUsers([...new Set(data.map((a) => a.studentId).filter(Boolean))]);
      setApplicants(
        data.map((a) => ({
          ...a,
          studentName: users[a.studentId]?.name || a.studentId || "Unknown student",
          photoUrl: users[a.studentId]?.photoUrl
        }))
      );
    } catch (e) {
      console.log("Error loading applicants:", e);
      setApplicants([]);
    } finally {
      setApplicantsLoading(false);
    }
  };

  const handleViewNotified = async (job) => {
    setNotifiedJob(job);
    setNotifiedLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "notifications"), where("jobId", "==", job.id), where("type", "==", "JobMatch"))
      );
      const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const users = await fetchUsers([...new Set(notifs.map((n) => n.studentId).filter(Boolean))]);
      setNotifiedStudents(
        notifs
          .map((n) => {
            const s = users[n.studentId] || {};
            return {
              id: n.id,
              studentName: s.name || n.studentId || "Unknown student",
              photoUrl: s.photoUrl,
              isRead: !!n.isRead,
              notifiedAt: n.createdAt,
              matchPercent: computeMatch(job.skills, s.skills)
            };
          })
          .sort((a, b) => b.matchPercent - a.matchPercent)
      );
    } catch (e) {
      console.log("Error loading notified students:", e);
      setNotifiedStudents([]);
    } finally {
      setNotifiedLoading(false);
    }
  };

  const actionBtn = (color) => ({
    color,
    borderRadius: R.tile,
    transition: "transform 0.15s ease, background-color 0.15s ease",
    "&:hover": { bgcolor: alpha(color, 0.14), transform: "scale(1.12)" }
  });

  const columns = [
    {
      field: "title",
      headerName: "Job",
      flex: 1.8,
      minWidth: 260,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, height: "100%" }}>
          <UserAvatar name={p.row.company || p.row.title} size={36} tone="primary" />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", lineHeight: 1.3 }}>
              {p.row.title || "-"}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.3 }}>
              {p.row.company || "-"}
            </Typography>
          </Box>
        </Box>
      )
    },
    { field: "location", headerName: "Location", flex: 1, minWidth: 130 },
    { field: "category", headerName: "Category", flex: 1, minWidth: 130 },
    { field: "salary", headerName: "Salary", flex: 0.8, minWidth: 110 },
    { field: "experience", headerName: "Experience", flex: 0.8, minWidth: 120 },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => <StatusChip label={p.value || "Active"} />
    },
    {
      field: "createdAt",
      headerName: "Created",
      flex: 0.9,
      minWidth: 120,
      valueGetter: (value, row) => toMillis(row.createdAt),
      renderCell: (p) => fmtDate(p.row.createdAt)
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="View applicants">
            <IconButton size="small" onClick={() => handleViewApplicants(p.row)} sx={actionBtn("#6366F1")}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Notified students">
            <IconButton size="small" onClick={() => handleViewNotified(p.row)} sx={actionBtn("#06B6D4")}>
              <NotificationsActiveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete job">
            <IconButton size="small" onClick={() => setDeleteTarget(p.row)} sx={actionBtn("#EF4444")}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  const activePct = stats.total ? Math.round((stats.active / stats.total) * 100) : 0;

  return (
    <Box sx={{ width: "100%", maxWidth: "1600px" }}>
      {/* Header (Dashboard style) */}
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
            background: `radial-gradient(circle, ${alpha("#22C55E", 0.18)}, transparent 70%)`,
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
                Jobs
              </Typography>
              <Typography sx={{ color: "text.secondary", mt: 1, lineHeight: 1.7, fontSize: 14.5 }}>
                Manage all job posts from employers.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "flex-start", md: "flex-end" }, gap: 0.75, flexShrink: 0 }}>
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
              <Typography sx={{ color: "text.secondary", fontSize: 12 }}>
                {filteredJobs.length} of {stats.total} jobs shown
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <Grid container spacing={3} sx={{ mb: 3.5 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total Jobs" value={stats.total} sub="All posted jobs" color="#6366F1" icon={<WorkIcon sx={{ fontSize: 28 }} />} loading={loading} delay={0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Active" value={stats.active} sub={`${activePct}% of all jobs`} subDot color="#22C55E" icon={<TaskAltIcon sx={{ fontSize: 28 }} />} loading={loading} delay={0.07} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Closed" value={stats.closed} sub="No longer hiring" subDot color="#EF4444" icon={<BlockIcon sx={{ fontSize: 28 }} />} loading={loading} delay={0.14} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Posted This Week" value={stats.week} sub="Last 7 days" color="#06B6D4" icon={<EventIcon sx={{ fontSize: 28 }} />} loading={loading} delay={0.21} />
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
              All Jobs
            </Typography>
            <Chip
              size="small"
              label="Live"
              sx={{
                borderRadius: R.pill, height: 24, fontWeight: 600, color: "#22C55E",
                bgcolor: alpha("#22C55E", 0.1), border: `1px solid ${alpha("#22C55E", 0.16)}`
              }}
            />
          </Box>

          <Divider sx={{ my: 2.25 }} />

          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 3 }}>
            <TextField
              placeholder="Search title, company, location, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                flex: "1 1 280px",
                "& .MuiOutlinedInput-root": {
                bgcolor: "transparent", borderRadius: R.tile,
                  transition: "box-shadow 0.2s ease",
                  "&.Mui-focused fieldset": { borderColor: "success.main" },
                  "&.Mui-focused": { boxShadow: `0 0 0 3px ${alpha("#22C55E", 0.18)}` }
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
            <Box sx={{ display: "flex", gap: 1 }}>
              {FILTERS.map((f) => {
                const on = filter === f.key;
                return (
                  <Chip
                    key={f.key}
                    label={f.label}
                    onClick={() => setFilter(f.key)}
                    sx={{
                      borderRadius: R.pill,
                      fontWeight: 700,
                      color: on ? "success.main" : "text.secondary",
                      bgcolor: on ? alpha("#22C55E", 0.14) : "transparent",
                      border: "1px solid",
                      borderColor: on ? alpha("#22C55E", 0.4) : "divider",
                      boxShadow: on ? `0 0 14px ${alpha("#22C55E", 0.2)}` : "none",
                      transition: "all 0.15s ease"
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {loading ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1.5} py={6}>
              <CircularProgress sx={{ color: "success.main" }} />
              <Typography color="text.secondary" fontSize={13}>Loading jobs...</Typography>
            </Box>
          ) : filteredJobs.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={8}>
              <WorkIcon sx={{ fontSize: 42, color: "text.secondary", opacity: 0.5 }} />
              <Typography color="text.secondary">No jobs found.</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                height: 650, width: "100%", animation: "fadeIn 0.4s ease",
                bgcolor: "transparent",
                border: "1px solid", borderColor: "divider", borderRadius: R.tile, overflow: "hidden"
              }}
            >
              <DataGrid
                rows={filteredJobs}
                columns={columns}
                rowHeight={64}
                pageSizeOptions={[5, 10, 20, 50]}
                disableRowSelectionOnClick
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
                    "&:hover": { backgroundColor: (t) => alpha(t.palette.text.primary, 0.04) }
                  },
                  "& .MuiDataGrid-footerContainer": { backgroundColor: "transparent", borderColor: "divider" },
                  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
        TransitionComponent={Fade}
        transitionDuration={220}
        PaperProps={{
          sx: { bgcolor: "background.paper", backgroundImage: "none", border: "1px solid", borderColor: "divider", borderRadius: R.card }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Job</DialogTitle>
        <DialogContent>
          <Divider sx={{ mb: 2 }} />
          <Typography>
            Delete <b>{deleteTarget?.title || "this job"}</b>
            {deleteTarget?.company ? ` at ${deleteTarget.company}` : ""}?
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            Existing applications for this job will not be removed. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            variant="outlined"
            disabled={deleting}
            color="inherit"
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

      {/* Applicants dialog */}
      <InfoDialog
        open={!!applicantsJob}
        onClose={() => setApplicantsJob(null)}
        title={`Applicants${applicantsJob?.title ? ` - ${applicantsJob.title}` : ""}`}
        icon={<PeopleIcon sx={{ color: "primary.main" }} />}
        color="#6366F1"
        loading={applicantsLoading}
        empty={applicants.length === 0}
        emptyText="No applicants yet for this job."
      >
        {applicants.map((a, i) => (
          <Box key={a.id} sx={listRowSx(i)}>
            <UserAvatar name={a.studentName} photoUrl={a.photoUrl} size={38} tone="primary" />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{a.studentName}</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Applied: {fmtDate(a.appliedAt)}</Typography>
            </Box>
            <StatusChip label={a.status || "Pending"} />
          </Box>
        ))}
      </InfoDialog>

      {/* Notified students dialog */}
      <InfoDialog
        open={!!notifiedJob}
        onClose={() => setNotifiedJob(null)}
        title={`Notified Students${notifiedJob?.title ? ` - ${notifiedJob.title}` : ""}`}
        icon={<NotificationsActiveIcon sx={{ color: "#06B6D4" }} />}
        color="#06B6D4"
        loading={notifiedLoading}
        empty={notifiedStudents.length === 0}
        emptyText="No students matched/notified for this job."
      >
        <Chip
          size="small"
          label={`${notifiedStudents.length} matched student${notifiedStudents.length > 1 ? "s" : ""}`}
          sx={{
            borderRadius: R.pill,
            alignSelf: "flex-start", fontWeight: 700, color: "#06B6D4",
            bgcolor: alpha("#06B6D4", 0.12), border: `1px solid ${alpha("#06B6D4", 0.25)}`
          }}
        />
        {notifiedStudents.map((s, i) => {
          const mc = s.matchPercent >= 75 ? "#22C55E" : s.matchPercent >= 40 ? "#F59E0B" : "#EF4444";
          return (
            <Box
              key={s.id}
              sx={{
                ...listRowSx(i),
                transition: "border-color 0.2s ease, transform 0.2s ease",
                "&:hover": { borderColor: alpha("#06B6D4", 0.4), transform: "translateX(2px)" }
              }}
            >
              <UserAvatar name={s.studentName} photoUrl={s.photoUrl} size={38} tone="primary" />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{s.studentName}</Typography>
                <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>Notified: {fmtDateTime(s.notifiedAt)}</Typography>
              </Box>
              <Tooltip title={s.isRead ? "Read" : "Unread"}>
                {s.isRead ? (
                  <CheckCircleIcon sx={{ fontSize: 18, color: "#22C55E" }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                )}
              </Tooltip>
              <Chip
                size="small"
                label={`${s.matchPercent}%`}
                sx={{
                  borderRadius: R.pill,
                  minWidth: 54, justifyContent: "center", fontWeight: 700, color: mc,
                  bgcolor: alpha(mc, 0.14), border: `1px solid ${alpha(mc, 0.35)}`
                }}
              />
            </Box>
          );
        })}
      </InfoDialog>
    </Box>
  );
}

export default Jobs;
