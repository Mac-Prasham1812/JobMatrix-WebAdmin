import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack as MuiStack,
  Divider,
  Tooltip,
  Fade,
  LinearProgress,
  Skeleton,
  Switch
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import SchoolIcon from "@mui/icons-material/School";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BlockIcon from "@mui/icons-material/Block";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, query, where, deleteDoc, doc, updateDoc } from "firebase/firestore";

import { db } from "../firebase/firebase";
import UserAvatar from "../components/UserAvatar";
import { exportToCsv } from "../utils/exportCsv";

// MUI v7 Stack ignores alignItems/justifyContent/flexWrap props; map them to sx
const Stack = ({ alignItems, justifyContent, flexWrap, sx, ...rest }) => (
  <MuiStack sx={{ alignItems, justifyContent, flexWrap, ...sx }} {...rest} />
);

// Fixed px radii so the global theme borderRadius does not inflate shapes
const R = { card: "14px", tile: "10px", pill: "12px" };

const C = {
  paper: "#101526",
  deep: "#0D1220",
  line: "#1C2333",
  text: "#F1F5F9",
  sub: "#8B96AB",
  muted: "#5B6678"
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "incomplete", label: "Incomplete profile" },
  { key: "applied", label: "Has applied" },
  { key: "disabled", label: "Disabled" }
];

function formatTime(value) {
  if (!value) return "-";
  if (typeof value?.toMillis === "function") return new Date(value.toMillis()).toLocaleString();
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000).toLocaleString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function completeness(student) {
  let score = 0;
  if (student.skills && (Array.isArray(student.skills) ? student.skills.length : String(student.skills).trim())) score += 25;
  if (student.experience && String(student.experience).trim()) score += 25;
  if (student.phone && String(student.phone).trim()) score += 25;
  if (student.photoUrl && String(student.photoUrl).trim()) score += 25;
  return score;
}

function pctColor(pct) {
  if (pct === 100) return "#22C55E";
  if (pct >= 50) return "#F59E0B";
  return "#EF4444";
}

function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "Student"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      const appsSnapshot = await getDocs(collection(db, "applications"));
      const countMap = {};
      appsSnapshot.docs.forEach((d) => {
        const sid = d.data().studentId;
        if (sid) countMap[sid] = (countMap[sid] || 0) + 1;
      });

      setStudents(data.map((s) => ({ ...s, applicationsCount: countMap[s.uid] || 0 })));
    } catch (error) {
      console.log("Error loading students:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const value = search.toLowerCase().trim();
    return students.filter((s) => {
      if (filter === "incomplete" && completeness(s) === 100) return false;
      if (filter === "applied" && !(s.applicationsCount > 0)) return false;
      if (filter === "disabled" && !s.isDisabled) return false;
      if (!value) return true;
      return (
        (s.name || "").toLowerCase().includes(value) ||
        (s.email || "").toLowerCase().includes(value) ||
        (s.phone || "").toLowerCase().includes(value) ||
        (s.uid || "").toLowerCase().includes(value)
      );
    });
  }, [students, search, filter]);

  const stats = useMemo(
    () => ({
      total: students.length,
      complete: students.filter((s) => completeness(s) === 100).length,
      applied: students.filter((s) => s.applicationsCount > 0).length,
      disabled: students.filter((s) => s.isDisabled).length
    }),
    [students]
  );

  const handleView = (student) => {
    setSelectedStudent(student);
    setViewOpen(true);
  };

  const handleDeleteClick = (student) => {
    setDeleteTarget(student);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", deleteTarget.id));
      setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.log("Delete student error:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleDisabled = async (student, value) => {
    try {
      await updateDoc(doc(db, "users", student.id), { isDisabled: value });
      setStudents((prev) => prev.map((s) => (s.id === student.id ? { ...s, isDisabled: value } : s)));
      if (selectedStudent?.id === student.id) {
        setSelectedStudent((prev) => ({ ...prev, isDisabled: value }));
      }
    } catch (error) {
      console.log("Error updating isDisabled:", error);
    }
  };

  const handleExportCsv = () => {
    const rows = filteredStudents.map((s) => ({
      name: s.name || "",
      email: s.email || "",
      phone: s.phone || "",
      profileCompleteness: `${completeness(s)}%`,
      applicationsCount: s.applicationsCount ?? 0,
      isDisabled: s.isDisabled ? "Yes" : "No",
      uid: s.uid || ""
    }));

    exportToCsv("students", rows, [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "profileCompleteness", label: "Profile %" },
      { key: "applicationsCount", label: "Applications" },
      { key: "isDisabled", label: "Disabled" },
      { key: "uid", label: "UID" }
    ]);
  };

  const statCards = [
    { title: "Total students", value: stats.total, color: "#6366F1", icon: <SchoolIcon sx={{ fontSize: 26 }} />, note: "Registered total" },
    { title: "Complete profiles", value: stats.complete, color: "#22C55E", icon: <TaskAltIcon sx={{ fontSize: 26 }} />, note: `${stats.total - stats.complete} incomplete` },
    { title: "Have applied", value: stats.applied, color: "#F59E0B", icon: <AssignmentIcon sx={{ fontSize: 26 }} />, note: "At least 1 application" },
    { title: "Disabled", value: stats.disabled, color: "#EF4444", icon: <BlockIcon sx={{ fontSize: 26 }} />, note: "Blocked from the app" }
  ];

  const columns = [
    {
      field: "name",
      headerName: "Student",
      flex: 1.6,
      minWidth: 260,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <UserAvatar name={params.value} photoUrl={params.row.photoUrl} tone="primary" />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", lineHeight: 1.35 }}>
              {params.value || "-"}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12.5, color: C.sub, lineHeight: 1.35 }}>
              {params.row.email || "-"}
            </Typography>
          </Box>
        </Stack>
      )
    },
    {
      field: "phone",
      headerName: "Phone",
      flex: 0.9,
      minWidth: 140,
      renderCell: (params) => (
        <Typography sx={{ fontSize: 13.5, color: params.value ? "#CBD5E1" : C.muted }}>
          {params.value || "Not added"}
        </Typography>
      )
    },
    {
      field: "profileCompleteness",
      headerName: "Profile",
      flex: 1,
      minWidth: 170,
      valueGetter: (value, row) => completeness(row),
      renderCell: (params) => {
        const pct = params.value;
        const color = pctColor(pct);
        return (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: "100%", pr: 1 }}>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                flex: 1,
                height: 6,
                borderRadius: "3px",
                bgcolor: "rgba(148,163,184,0.15)",
                "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: "3px" }
              }}
            />
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color, minWidth: 34, textAlign: "right" }}>
              {pct}%
            </Typography>
          </Stack>
        );
      }
    },
    {
      field: "applicationsCount",
      headerName: "Applications",
      flex: 0.7,
      minWidth: 120,
      renderCell: (params) => {
        const active = (params.value ?? 0) > 0;
        const color = active ? "#F59E0B" : "#64748B";
        return (
          <Chip
            label={params.value ?? 0}
            size="small"
            sx={{
              borderRadius: R.pill,
              minWidth: 36,
              bgcolor: `${color}1A`,
              color,
              border: `1px solid ${color}33`,
              fontWeight: 700
            }}
          />
        );
      }
    },
    {
      field: "isDisabled",
      headerName: "Access",
      flex: 0.9,
      minWidth: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const off = !!params.value;
        const color = off ? "#EF4444" : "#22C55E";
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title={off ? "Enable account" : "Disable account"}>
              <Switch
                checked={!off}
                onChange={(e) => handleToggleDisabled(params.row, !e.target.checked)}
                color="success"
                size="small"
              />
            </Tooltip>
            <Chip
              label={off ? "Disabled" : "Active"}
              size="small"
              sx={{
                borderRadius: R.pill,
                bgcolor: `${color}1A`,
                color,
                border: `1px solid ${color}33`,
                fontWeight: 600,
                height: 24
              }}
            />
          </Stack>
        );
      }
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View details">
            <IconButton
              onClick={() => handleView(params.row)}
              size="small"
              sx={{
                color: "#818CF8",
                borderRadius: R.tile,
                "&:hover": { bgcolor: "rgba(99,102,241,0.14)" }
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete student">
            <IconButton
              onClick={() => handleDeleteClick(params.row)}
              size="small"
              sx={{
                color: "#EF4444",
                borderRadius: R.tile,
                "&:hover": { bgcolor: "rgba(239,68,68,0.14)" }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ];

  const dialogPaper = {
    sx: {
      backgroundColor: C.paper,
      color: C.text,
      border: `1px solid ${C.line}`,
      borderRadius: R.card,
      backgroundImage: "none"
    }
  };

  const detailRow = (label, value, breakAll) => (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        py: 1.1,
        borderBottom: `1px solid ${C.line}`,
        "&:last-of-type": { borderBottom: 0 }
      }}
    >
      <Typography sx={{ color: C.sub, fontSize: 13.5, flexShrink: 0 }}>{label}</Typography>
      <Typography
        sx={{
          color: "#E2E8F0",
          fontSize: 13.5,
          fontWeight: 500,
          textAlign: "right",
          wordBreak: breakAll ? "break-all" : "normal"
        }}
      >
        {value}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ width: "100%", maxWidth: "1600px" }}>
      {/* Header */}
      <Card
        sx={{
          mb: 4,
          borderRadius: R.card,
          background: "linear-gradient(135deg, rgba(16,21,38,0.9) 0%, rgba(13,18,32,0.9) 100%)",
          border: `1px solid ${C.line}`,
          boxShadow: "0 14px 32px rgba(0,0,0,0.2)",
          backdropFilter: "blur(16px)",
          animation: "fadeUp 0.4s ease",
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.16), transparent 70%)",
            pointerEvents: "none"
          }
        }}
      >
        <CardContent sx={{ px: { xs: 3, md: 4.5 }, py: 3.75, position: "relative", zIndex: 1 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            spacing={2.5}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: "#818CF8", letterSpacing: "0.14em", fontWeight: 600 }}>
                JobMatrix Admin Panel
              </Typography>
              <Typography variant="h4" fontWeight="700" sx={{ color: "#F8FAFC", mt: 0.5 }}>
                Students
              </Typography>
              <Typography sx={{ color: C.sub, mt: 1, maxWidth: 760, lineHeight: 1.7, fontSize: 14.5 }}>
                Review profiles, track applications, and control access for every registered student.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
              onClick={handleExportCsv}
              sx={{
                textTransform: "none",
                borderRadius: R.pill,
                fontWeight: 600,
                px: 2.25,
                borderColor: "rgba(99,102,241,0.35)",
                color: "#A5B4FC",
                bgcolor: "rgba(99,102,241,0.12)",
                flexShrink: 0,
                "&:hover": { borderColor: "#6366F1", bgcolor: "rgba(99,102,241,0.2)" }
              }}
            >
              Export CSV
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <Grid container spacing={3}>
        {statCards.map((card, index) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                borderRadius: R.card,
                background: `linear-gradient(135deg, ${card.color}26 0%, ${C.paper} 65%)`,
                backdropFilter: "blur(10px)",
                border: `1px solid ${card.color}55`,
                boxShadow: `0 0 22px ${card.color}1F`,
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
                animation: "fadeUp 0.4s ease",
                animationDelay: `${index * 0.07}s`,
                animationFillMode: "backwards",
                "&:hover": { transform: "translateY(-4px)", boxShadow: `0 0 30px ${card.color}40` }
              }}
            >
              <CardContent sx={{ p: 2.25, display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: R.tile,
                    bgcolor: `${card.color}22`,
                    border: `1px solid ${card.color}55`,
                    boxShadow: `0 0 16px ${card.color}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: card.color,
                    flexShrink: 0
                  }}
                >
                  {card.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: "#A5B0C5", fontSize: 13 }}>{card.title}</Typography>
                  {loading ? (
                    <Skeleton variant="text" width={56} height={36} sx={{ bgcolor: "rgba(148,163,184,0.08)", transform: "none" }} />
                  ) : (
                    <Typography sx={{ color: C.text, fontWeight: 700, fontSize: 28, lineHeight: 1.2 }}>
                      {card.value}
                    </Typography>
                  )}
                  <Typography sx={{ color: C.sub, fontWeight: 500, fontSize: 12 }}>{card.note}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Table card */}
      <Card
        sx={{
          mt: 3.5,
          borderRadius: R.card,
          background: C.paper,
          border: `1px solid ${C.line}`,
          boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
          animation: "fadeUp 0.4s ease",
          animationDelay: "0.2s",
          animationFillMode: "backwards"
        }}
      >
        <CardContent sx={{ p: 3.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.25 }}>
            <Typography variant="h6" fontWeight="700" sx={{ color: "#F8FAFC", fontSize: 17 }}>
              All students
            </Typography>
            <Chip
              size="small"
              label={`${filteredStudents.length} shown`}
              sx={{
                borderRadius: R.pill,
                bgcolor: "rgba(99,102,241,0.1)",
                color: "#818CF8",
                border: "1px solid rgba(99,102,241,0.16)",
                fontWeight: 600,
                height: 24
              }}
            />
          </Stack>

          <Divider sx={{ mb: 2.25, borderColor: C.line }} />

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ mb: 2.5 }}>
            <TextField
              placeholder="Search by name, email, phone or UID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{
                flex: 1,
                maxWidth: { md: 420 },
                "& .MuiOutlinedInput-root": {
                  color: C.text,
                  backgroundColor: C.deep,
                  borderRadius: R.tile,
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  "& fieldset": { borderColor: C.line },
                  "&:hover fieldset": { borderColor: "#2A3447" },
                  "&.Mui-focused fieldset": { borderColor: "#6366F1" },
                  "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(99,102,241,0.18)" }
                },
                "& .MuiInputBase-input::placeholder": { color: C.sub, opacity: 1 }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: C.sub, fontSize: 20 }} />
                  </InputAdornment>
                )
              }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <Chip
                    key={f.key}
                    label={f.label}
                    onClick={() => setFilter(f.key)}
                    sx={{
                      borderRadius: R.pill,
                      fontWeight: 600,
                      bgcolor: active ? "rgba(99,102,241,0.18)" : C.deep,
                      color: active ? "#A5B4FC" : C.sub,
                      border: `1px solid ${active ? "rgba(99,102,241,0.4)" : C.line}`,
                      "&:hover": { bgcolor: "rgba(99,102,241,0.14)" }
                    }}
                  />
                );
              })}
            </Stack>
          </Stack>

          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Box key={i} sx={{ border: `1px solid ${C.line}`, borderRadius: R.tile, p: 2, bgcolor: C.deep }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: "rgba(148,163,184,0.08)" }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="30%" height={20} sx={{ bgcolor: "rgba(148,163,184,0.08)" }} />
                      <Skeleton variant="text" width="20%" height={16} sx={{ bgcolor: "rgba(148,163,184,0.06)" }} />
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Box>
          ) : filteredStudents.length === 0 ? (
            <Box sx={{ border: `1px solid ${C.line}`, borderRadius: R.tile, p: 2.5, bgcolor: C.deep }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: R.tile,
                    bgcolor: C.paper,
                    border: `1px solid ${C.line}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.muted,
                    flexShrink: 0
                  }}
                >
                  <InboxOutlinedIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ color: "#E2E8F0", fontWeight: 600, fontSize: 15 }}>No students found</Typography>
                  <Typography sx={{ color: C.sub, mt: 0.4, fontSize: 13.5 }}>
                    Try a different search or clear the filter.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ) : (
            <Box sx={{ height: 640, width: "100%", animation: "fadeIn 0.4s ease" }}>
              <DataGrid
                rows={filteredStudents}
                columns={columns}
                rowHeight={64}
                columnHeaderHeight={48}
                pageSizeOptions={[10, 20, 50]}
                disableRowSelectionOnClick
                disableColumnMenu
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                sx={{
                  border: `1px solid ${C.line}`,
                  borderRadius: R.tile,
                  color: C.text,
                  backgroundColor: C.paper,
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: C.deep,
                    borderBottom: `1px solid ${C.line}`
                  },
                  "& .MuiDataGrid-columnHeader": { backgroundColor: C.deep },
                  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 600, fontSize: 13, color: "#A5B0C5" },
                  "& .MuiDataGrid-columnSeparator": { display: "none" },
                  "& .MuiDataGrid-cell": {
                    display: "flex",
                    alignItems: "center",
                    borderColor: C.line,
                    outline: "none !important"
                  },
                  "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": { outline: "none" },
                  "& .MuiDataGrid-row": {
                    backgroundColor: C.paper,
                    transition: "background-color 0.15s ease",
                    "&:hover": { backgroundColor: C.deep }
                  },
                  "& .MuiDataGrid-footerContainer": {
                    borderTop: `1px solid ${C.line}`,
                    backgroundColor: C.deep,
                    color: C.text
                  },
                  "& .MuiTablePagination-root": { color: "#A5B0C5" },
                  "& .MuiDataGrid-filler": { backgroundColor: C.paper },
                  "& .MuiDataGrid-scrollbarFiller": { backgroundColor: C.paper }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* View dialog */}
      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        fullWidth
        maxWidth="sm"
        TransitionComponent={Fade}
        transitionDuration={220}
        PaperProps={dialogPaper}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>Student details</DialogTitle>
        <DialogContent>
          <Divider sx={{ borderColor: C.line, mb: 2.5 }} />
          {selectedStudent && (
            <Box>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ mb: 2.5, p: 2, borderRadius: R.tile, bgcolor: C.deep, border: `1px solid ${C.line}` }}
              >
                <UserAvatar name={selectedStudent.name} photoUrl={selectedStudent.photoUrl} size={52} tone="primary" />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontWeight: 700, fontSize: 16, color: "#F8FAFC" }}>
                    {selectedStudent.name || "-"}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 13, color: C.sub }}>
                    {selectedStudent.email || "-"}
                  </Typography>
                </Box>
                <Chip
                  label={selectedStudent.isDisabled ? "Disabled" : "Active"}
                  size="small"
                  sx={{
                    borderRadius: R.pill,
                    fontWeight: 600,
                    bgcolor: selectedStudent.isDisabled ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                    color: selectedStudent.isDisabled ? "#EF4444" : "#22C55E",
                    border: `1px solid ${selectedStudent.isDisabled ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`
                  }}
                />
              </Stack>

              <Box sx={{ mb: 2 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                  <Typography sx={{ color: C.sub, fontSize: 13.5 }}>Profile completeness</Typography>
                  <Typography sx={{ color: pctColor(completeness(selectedStudent)), fontSize: 13.5, fontWeight: 600 }}>
                    {completeness(selectedStudent)}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={completeness(selectedStudent)}
                  sx={{
                    height: 6,
                    borderRadius: "3px",
                    bgcolor: "rgba(148,163,184,0.15)",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: pctColor(completeness(selectedStudent)),
                      borderRadius: "3px"
                    }
                  }}
                />
              </Box>

              <Box>
                {detailRow("Email", selectedStudent.email || "-", true)}
                {detailRow("Role", selectedStudent.role || "Student")}
                {detailRow("Phone", selectedStudent.phone || "-")}
                {detailRow("Applications", selectedStudent.applicationsCount ?? 0)}
                {detailRow("Last active", formatTime(selectedStudent.lastSeen))}
                {detailRow("Joined", formatTime(selectedStudent.createdAt))}
                {detailRow("UID", selectedStudent.uid || "-", true)}
              </Box>

              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mt: 2, p: 1.5, pl: 2, borderRadius: R.tile, bgcolor: C.deep, border: `1px solid ${C.line}` }}
              >
                <Typography sx={{ color: "#E2E8F0", fontSize: 13.5, fontWeight: 500 }}>Account active</Typography>
                <Switch
                  checked={!selectedStudent.isDisabled}
                  onChange={(e) => handleToggleDisabled(selectedStudent, !e.target.checked)}
                  color="success"
                  size="small"
                />
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setViewOpen(false)}
            variant="contained"
            sx={{ textTransform: "none", borderRadius: R.pill, fontWeight: 600, boxShadow: "none" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        fullWidth
        maxWidth="xs"
        TransitionComponent={Fade}
        transitionDuration={220}
        PaperProps={dialogPaper}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>Delete student</DialogTitle>
        <DialogContent>
          <Divider sx={{ borderColor: C.line, mb: 2 }} />
          <Typography sx={{ color: "#E2E8F0" }}>
            Delete <b>{deleteTarget?.name || "this student"}</b>?
          </Typography>
          <Typography sx={{ mt: 1, color: C.sub, fontSize: 13.5 }}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            variant="outlined"
            disabled={deleting}
            sx={{ textTransform: "none", borderRadius: R.pill, borderColor: C.line, color: "#E2E8F0", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            disabled={deleting}
            sx={{
              textTransform: "none",
              borderRadius: R.pill,
              fontWeight: 600,
              boxShadow: "none",
              bgcolor: "#EF4444",
              "&:hover": { bgcolor: "#DC2626", boxShadow: "none" }
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Students;
