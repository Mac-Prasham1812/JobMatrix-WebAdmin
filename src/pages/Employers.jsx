import { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Grid, Typography, TextField, InputAdornment, CircularProgress,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Divider, Fade, Switch, Skeleton
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import VerifiedIcon from "@mui/icons-material/Verified";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import BlockIcon from "@mui/icons-material/Block";
import WorkIcon from "@mui/icons-material/Work";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";

import { db } from "../firebase/firebase";
import UserAvatar from "../components/UserAvatar";
import { exportToCsv } from "../utils/exportCsv";

// Fixed px radii so the global theme borderRadius (18) does not inflate shapes
const R = { card: "14px", tile: "10px", pill: "12px" };

const PURPLE = "#A855F7";
const GREEN = "#22C55E";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const CYAN = "#06B6D4";

const FILTERS = [
  { key: "all", label: "All", color: PURPLE },
  { key: "verified", label: "Verified", color: GREEN },
  { key: "unverified", label: "Unverified", color: AMBER },
  { key: "disabled", label: "Disabled", color: RED }
];

function formatTime(value) {
  if (!value) return "-";
  if (typeof value?.toMillis === "function") return new Date(value.toMillis()).toLocaleString();
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000).toLocaleString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

// Smooth number count-up for stat cards
function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function StatValue({ value }) {
  const v = useCountUp(value);
  return (
    <Typography sx={{ color: "text.primary", fontWeight: 700, fontSize: 28, lineHeight: 1.2 }}>
      {v}
    </Typography>
  );
}

function StatCard({ label, value, sub, color, icon, loading, delay = 0 }) {
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
        "&::before": {
          content: '""', position: "absolute", top: 0, left: "-60%", width: "40%", height: "100%",
          background: `linear-gradient(90deg, transparent, ${alpha(color, 0.12)}, transparent)`,
          transform: "skewX(-20deg)", transition: "left 0.7s ease", pointerEvents: "none"
        },
        "&:hover": { transform: "translateY(-4px)", boxShadow: `0 0 30px ${alpha(color, 0.25)}`, "&::before": { left: "130%" } }
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
            <StatValue value={value} />
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: color }} />
            <Typography sx={{ color: "text.secondary", fontWeight: 500, fontSize: 12 }}>{sub}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function StatePill({ on, onLabel, offLabel, onColor, offColor }) {
  const c = on ? onColor : offColor;
  return (
    <Chip
      size="small"
      label={on ? onLabel : offLabel}
      sx={{
        borderRadius: R.pill, height: 24, fontWeight: 700, color: c,
        bgcolor: alpha(c, 0.14), border: `1px solid ${alpha(c, 0.3)}`,
        transition: "all 0.25s ease"
      }}
    />
  );
}

const dialogPaper = {
  sx: { bgcolor: "background.paper", backgroundImage: "none", border: "1px solid", borderColor: "divider", borderRadius: R.card }
};

function Employers() {
  const [employers, setEmployers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedEmployer, setSelectedEmployer] = useState(null);

  useEffect(() => {
    loadEmployers();
  }, []);

  const loadEmployers = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "Employer"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      const jobsSnapshot = await getDocs(collection(db, "jobs"));
      const countMap = {};
      jobsSnapshot.docs.forEach((d) => {
        const pid = d.data().employerId;
        if (pid) countMap[pid] = (countMap[pid] || 0) + 1;
      });

      setEmployers(data.map((e) => ({ ...e, jobsCount: countMap[e.uid] || 0 })));
    } catch (error) {
      console.log("Error loading employers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (employer, field, value) => {
    try {
      await updateDoc(doc(db, "users", employer.id), { [field]: value });
      setEmployers((prev) => prev.map((e) => (e.id === employer.id ? { ...e, [field]: value } : e)));
      if (selectedEmployer?.id === employer.id) {
        setSelectedEmployer((prev) => ({ ...prev, [field]: value }));
      }
    } catch (error) {
      console.log(`Error updating ${field}:`, error);
    }
  };

  const filteredEmployers = useMemo(() => {
    const v = search.toLowerCase().trim();
    return employers.filter((e) => {
      if (filter === "verified" && !e.isVerified) return false;
      if (filter === "unverified" && e.isVerified) return false;
      if (filter === "disabled" && !e.isDisabled) return false;
      if (!v) return true;
      return [e.name, e.email, e.phone, e.uid].some((f) => String(f || "").toLowerCase().includes(v));
    });
  }, [employers, search, filter]);

  const stats = useMemo(
    () => ({
      total: employers.length,
      verified: employers.filter((e) => e.isVerified).length,
      unverified: employers.filter((e) => !e.isVerified).length,
      disabled: employers.filter((e) => e.isDisabled).length,
      jobs: employers.reduce((sum, e) => sum + (e.jobsCount || 0), 0)
    }),
    [employers]
  );

  const handleExportCsv = () => {
    const rows = filteredEmployers.map((e) => ({
      name: e.name || "",
      email: e.email || "",
      phone: e.phone || "",
      jobsCount: e.jobsCount ?? 0,
      isVerified: e.isVerified ? "Yes" : "No",
      isDisabled: e.isDisabled ? "Yes" : "No",
      uid: e.uid || ""
    }));

    exportToCsv("employers", rows, [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "jobsCount", label: "Jobs Posted" },
      { key: "isVerified", label: "Verified" },
      { key: "isDisabled", label: "Disabled" },
      { key: "uid", label: "UID" }
    ]);
  };

  const iconBtn = (color) => ({
    color,
    borderRadius: R.tile,
    transition: "transform 0.15s ease, background-color 0.15s ease",
    "&:hover": { bgcolor: alpha(color, 0.14), transform: "scale(1.12)" }
  });

  const columns = [
    {
      field: "name",
      headerName: "Employer",
      flex: 1.7,
      minWidth: 270,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, height: "100%", minWidth: 0 }}>
          <UserAvatar name={p.value} photoUrl={p.row.photoUrl} size={38} tone="secondary" />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", lineHeight: 1.3 }}>
              {p.value || "-"}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.3 }}>
              {p.row.email || "-"}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      field: "phone",
      headerName: "Phone",
      flex: 0.9,
      minWidth: 140,
      renderCell: (p) => (
        <Typography sx={{ fontSize: 13.5, color: p.value ? "text.primary" : "text.secondary" }}>
          {p.value || "Not added"}
        </Typography>
      )
    },
    {
      field: "jobsCount",
      headerName: "Jobs posted",
      flex: 0.7,
      minWidth: 130,
      renderCell: (p) => {
        const on = (p.value ?? 0) > 0;
        const c = on ? CYAN : "#64748B";
        return (
          <Chip
            size="small"
            icon={<WorkIcon sx={{ fontSize: 14, color: `${c} !important` }} />}
            label={p.value ?? 0}
            sx={{
              borderRadius: R.pill, minWidth: 54, fontWeight: 700, color: c,
              bgcolor: alpha(c, 0.14), border: `1px solid ${alpha(c, 0.3)}`
            }}
          />
        );
      }
    },
    {
      field: "isVerified",
      headerName: "Verification",
      flex: 1,
      minWidth: 190,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title={p.value ? "Remove verification" : "Verify employer"}>
            <Switch
              size="small"
              color="success"
              checked={!!p.value}
              onChange={(e) => handleToggle(p.row, "isVerified", e.target.checked)}
            />
          </Tooltip>
          <StatePill on={!!p.value} onLabel="Verified" offLabel="Pending" onColor={GREEN} offColor={AMBER} />
        </Box>
      )
    },
    {
      field: "isDisabled",
      headerName: "Disabled",
      flex: 1,
      minWidth: 170,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const off = !!p.value;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title={off ? "Enable account" : "Disable account"}>
              <Switch
                size="small"
                color="error"
                checked={off}
                onChange={(e) => handleToggle(p.row, "isDisabled", e.target.checked)}
              />
            </Tooltip>
            <StatePill on={!off} onLabel="Active" offLabel="Disabled" onColor={GREEN} offColor={RED} />
          </Box>
        );
      }
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Tooltip title="View details">
          <IconButton size="small" onClick={() => setSelectedEmployer(p.row)} sx={iconBtn(PURPLE)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  const detailRow = (label, value, breakAll) => (
    <Box
      sx={{
        display: "flex", justifyContent: "space-between", gap: 2, py: 1.1,
        borderBottom: "1px solid", borderColor: "divider",
        "&:last-of-type": { borderBottom: 0 }
      }}
    >
      <Typography sx={{ color: "text.secondary", fontSize: 13.5, flexShrink: 0 }}>{label}</Typography>
      <Typography
        sx={{
          color: "text.primary", fontSize: 13.5, fontWeight: 500, textAlign: "right",
          wordBreak: breakAll ? "break-all" : "normal"
        }}
      >
        {value}
      </Typography>
    </Box>
  );

  const toggleRow = (label, hint, checked, onChange, color = "success") => (
    <Box
      sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        mt: 1.5, p: 1.5, pl: 2, borderRadius: R.tile, bgcolor: "background.default",
        border: "1px solid", borderColor: "divider"
      }}
    >
      <Box>
        <Typography sx={{ color: "text.primary", fontSize: 13.5, fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ color: "text.secondary", fontSize: 12 }}>{hint}</Typography>
      </Box>
      <Switch size="small" color={color} checked={checked} onChange={onChange} />
    </Box>
  );

  const sel = selectedEmployer;

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
            content: '""', position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(PURPLE, 0.2)}, transparent 70%)`,
            animation: "driftB 9s ease-in-out infinite", pointerEvents: "none"
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
                Employers
              </Typography>
              <Typography sx={{ color: "text.secondary", mt: 1, lineHeight: 1.7, fontSize: 14.5 }}>
                Verify companies, control access, and review the jobs each employer has posted.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "flex-start", md: "flex-end" }, gap: 1, flexShrink: 0 }}>
              <Chip
                icon={
                  <Box
                    sx={{
                      width: 8, height: 8, borderRadius: "50%", ml: 1.25,
                      bgcolor: loading ? AMBER : GREEN,
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
                  textTransform: "none", borderRadius: R.pill, fontWeight: 600, px: 2.25,
                  borderColor: alpha(PURPLE, 0.4), color: PURPLE, bgcolor: alpha(PURPLE, 0.1),
                  transition: "transform 0.15s ease",
                  "&:hover": { borderColor: PURPLE, bgcolor: alpha(PURPLE, 0.18), transform: "translateY(-1px)" }
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
          <StatCard label="Total Employers" value={stats.total} sub={`${stats.jobs} jobs posted`} color={PURPLE} icon={<BusinessIcon sx={{ fontSize: 28 }} />} loading={loading} delay={0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Verified" value={stats.verified} sub="Can post jobs" color={GREEN} icon={<VerifiedIcon sx={{ fontSize: 28 }} />} loading={loading} delay={0.07} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Pending Verification" value={stats.unverified} sub="Blocked from posting" color={AMBER} icon={<HourglassTopIcon sx={{ fontSize: 28 }} />} loading={loading} delay={0.14} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Disabled" value={stats.disabled} sub="Blocked from the app" color={RED} icon={<BlockIcon sx={{ fontSize: 28 }} />} loading={loading} delay={0.21} />
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
              All Employers
            </Typography>
            <Chip
              size="small"
              label={`${filteredEmployers.length} shown`}
              sx={{
                borderRadius: R.pill, height: 24, fontWeight: 600, color: PURPLE,
                bgcolor: alpha(PURPLE, 0.1), border: `1px solid ${alpha(PURPLE, 0.2)}`
              }}
            />
          </Box>

          <Divider sx={{ my: 2.25 }} />

          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 3 }}>
            <TextField
              placeholder="Search name, email, phone or UID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                flex: "1 1 280px",
                "& .MuiOutlinedInput-root": {
                  bgcolor: "transparent",
                  borderRadius: R.tile,
                  transition: "box-shadow 0.2s ease",
                  "&.Mui-focused fieldset": { borderColor: PURPLE },
                  "&.Mui-focused": { boxShadow: `0 0 0 3px ${alpha(PURPLE, 0.18)}` }
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
                return (
                  <Chip
                    key={f.key}
                    label={f.label}
                    onClick={() => setFilter(f.key)}
                    sx={{
                      borderRadius: R.pill,
                      fontWeight: 700,
                      color: on ? f.color : "text.secondary",
                      bgcolor: on ? alpha(f.color, 0.14) : "transparent",
                      border: "1px solid",
                      borderColor: on ? alpha(f.color, 0.4) : "divider",
                      boxShadow: on ? `0 0 14px ${alpha(f.color, 0.2)}` : "none",
                      transition: "all 0.15s ease"
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {loading ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1.5} py={6}>
              <CircularProgress sx={{ color: PURPLE }} />
              <Typography color="text.secondary" fontSize={13}>Loading employers...</Typography>
            </Box>
          ) : filteredEmployers.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={8}>
              <BusinessIcon sx={{ fontSize: 42, color: "text.secondary", opacity: 0.5 }} />
              <Typography color="text.secondary">No employers found.</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                height: 600, width: "100%", animation: "fadeIn 0.4s ease",
                border: "1px solid", borderColor: "divider", borderRadius: R.tile, overflow: "hidden"
              }}
            >
              <DataGrid
                rows={filteredEmployers}
                columns={columns}
                rowHeight={66}
                pageSizeOptions={[5, 10, 20, 50]}
                disableRowSelectionOnClick
                disableColumnMenu
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
                  "& .MuiDataGrid-columnSeparator": { display: "none" },
                  "& .MuiDataGrid-cell": { borderColor: "divider", display: "flex", alignItems: "center" },
                  "& .MuiDataGrid-row": {
                    backgroundColor: "transparent",
                    transition: "background-color 0.15s ease, box-shadow 0.15s ease",
                    "&:hover": {
                      backgroundColor: (t) => alpha(t.palette.text.primary, 0.04),
                      boxShadow: `inset 3px 0 0 ${PURPLE}`
                    }
                  },
                  "& .MuiDataGrid-footerContainer": { backgroundColor: "transparent", borderColor: "divider" },
                  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Details dialog */}
      <Dialog
        open={!!sel}
        onClose={() => setSelectedEmployer(null)}
        fullWidth
        maxWidth="sm"
        TransitionComponent={Fade}
        transitionDuration={220}
        PaperProps={dialogPaper}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>Employer details</DialogTitle>
        <DialogContent>
          <Divider sx={{ mb: 2.5 }} />
          {sel && (
            <Box>
              <Box
                sx={{
                  display: "flex", alignItems: "center", gap: 2, mb: 2.5, p: 2,
                  borderRadius: R.tile, bgcolor: "background.default",
                  border: "1px solid", borderColor: "divider"
                }}
              >
                <UserAvatar name={sel.name} photoUrl={sel.photoUrl} size={52} tone="secondary" />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontWeight: 700, fontSize: 16, color: "text.primary" }}>
                    {sel.name || "-"}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 13, color: "text.secondary" }}>
                    {sel.email || "-"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, alignItems: "flex-end" }}>
                  <StatePill on={!!sel.isVerified} onLabel="Verified" offLabel="Pending" onColor={GREEN} offColor={AMBER} />
                  <StatePill on={!sel.isDisabled} onLabel="Active" offLabel="Disabled" onColor={GREEN} offColor={RED} />
                </Box>
              </Box>

              <Box>
                {detailRow("Phone", sel.phone || "-")}
                {detailRow("Jobs posted", sel.jobsCount ?? 0)}
                {detailRow("Last active", formatTime(sel.lastSeen))}
                {detailRow("Joined", formatTime(sel.createdAt))}
                {detailRow("UID", sel.uid || "-", true)}
              </Box>

              {toggleRow(
                "Verified employer",
                "Unverified employers cannot post jobs",
                !!sel.isVerified,
                (e) => handleToggle(sel, "isVerified", e.target.checked)
              )}
              {toggleRow(
                "Disable account",
                "Disabled accounts are logged out and blocked",
                !!sel.isDisabled,
                (e) => handleToggle(sel, "isDisabled", e.target.checked),
                "error"
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setSelectedEmployer(null)}
            variant="contained"
            sx={{ textTransform: "none", borderRadius: R.pill, fontWeight: 600, boxShadow: "none" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Employers;
