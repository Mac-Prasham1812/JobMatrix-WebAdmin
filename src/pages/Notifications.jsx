import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Checkbox,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  MenuItem,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import CloseIcon from "@mui/icons-material/Close";
import NotificationsIcon from "@mui/icons-material/Notifications";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DownloadIcon from "@mui/icons-material/Download";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import FlashOnIcon from "@mui/icons-material/FlashOn";

import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  getCountFromServer,
  where
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import useUnreadCount from "../hooks/useUnreadCount";
import { COL, getMeta, toMillis, timeAgo, fullDate, runBatch, markAllRead } from "../utils/notificationUtils";

const PAGE = 25;
const DAY = 86400000;
const ACCENT = "#6366F1";

// Fixed px radii so the global theme borderRadius does not inflate shapes
const R = { card: "14px", field: "10px", chip: "8px", tile: "10px" };

const panel = {
  bgcolor: "#101526",
  border: "1px solid #232B45",
  borderRadius: R.card,
  boxShadow: "0 8px 30px rgba(0,0,0,0.25)"
};

const glowCard = (c) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: R.card,
  border: `1px solid ${c}55`,
  background: `linear-gradient(135deg, ${c}26 0%, #101526 65%)`,
  boxShadow: `0 0 22px ${c}1F`,
  transition: "box-shadow .2s ease, transform .2s ease",
  "&:hover": { boxShadow: `0 0 30px ${c}40`, transform: "translateY(-2px)" }
});

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: R.field, bgcolor: "#0B1220", fontSize: 13.5 },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#232B45" }
};

const menuProps = {
  PaperProps: { sx: { borderRadius: R.field, bgcolor: "#101526", border: "1px solid #232B45", mt: 0.5 } }
};

const btnSx = { textTransform: "none", fontWeight: 600, borderRadius: R.field };

const msOf = (n) => toMillis(n.createdAt) || Date.now();

function fetchTotal(setTotal) {
  getCountFromServer(collection(db, COL))
    .then((r) => setTotal(r.data().count))
    .catch(() => {});
}

function Notifications() {
  const navigate = useNavigate();
  const unread = useUnreadCount();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE);
  const [sortDir, setSortDir] = useState("desc");

  const [tab, setTab] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [range, setRange] = useState("all");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  // Live paged list
  useEffect(() => {
    const q = query(collection(db, COL), orderBy("createdAt", sortDir), limit(pageSize));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        fetchTotal(setTotal);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [sortDir, pageSize]);

  // Live "this week" count
  useEffect(() => {
    const q = query(collection(db, COL), orderBy("createdAt", "desc"), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      const cutoff = Date.now() - 7 * DAY;
      setWeekCount(snap.docs.filter((d) => (toMillis(d.data().createdAt) || Date.now()) >= cutoff).length);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setSelected([]);
  }, [tab, typeFilter, range, search]);

  const totalCount = total || items.length;
  const readCount = Math.max(total - unread, 0);
  const hasMore = total > 0 ? items.length < total : items.length >= pageSize;

  const typeCounts = useMemo(() => {
    const map = {};
    items.forEach((n) => {
      const key = n.type || "General";
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    let cutoff = 0;
    if (range === "today") cutoff = startToday.getTime();
    else if (range === "7d") cutoff = Date.now() - 7 * DAY;
    else if (range === "30d") cutoff = Date.now() - 30 * DAY;

    return items.filter((n) => {
      if (tab === 1 && n.isRead) return false;
      if (tab === 2 && !n.isRead) return false;
      if (typeFilter !== "all" && (n.type || "General") !== typeFilter) return false;
      if (cutoff && msOf(n) < cutoff) return false;
      if (term) {
        const hay = `${n.title || ""} ${n.message || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [items, tab, typeFilter, range, search]);

  const groups = useMemo(() => {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const t0 = startToday.getTime();
    const map = {};

    filtered.forEach((n) => {
      const t = msOf(n);
      let g = "Older";
      if (t >= t0) g = "Today";
      else if (t >= t0 - DAY) g = "Yesterday";
      else if (t >= t0 - 6 * DAY) g = "This week";
      if (!map[g]) map[g] = [];
      map[g].push(n);
    });

    let order = ["Today", "Yesterday", "This week", "Older"];
    if (sortDir === "asc") order = order.reverse();
    return order.filter((g) => map[g]).map((g) => ({ label: g, items: map[g] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortDir, tick]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) setToast({ msg: okMsg, sev: "success" });
    } catch (e) {
      console.log(e);
      setToast({ msg: "Action failed. Try again.", sev: "error" });
    } finally {
      setBusy(false);
    }
  };

  const setRead = (ids, value) =>
    run(
      () => runBatch(ids, (b, ref) => b.update(ref, { isRead: value })),
      value ? "Marked as read" : "Marked as unread"
    );

  const toggleOne = (n) => setRead([n.id], !n.isRead);

  const deleteOne = (n) =>
    run(async () => {
      await deleteDoc(doc(db, COL, n.id));
      setSelected((s) => s.filter((id) => id !== n.id));
      fetchTotal(setTotal);
    }, "Notification deleted");

  const openItem = (n) => {
    if (!n.isRead) updateDoc(doc(db, COL, n.id), { isRead: true }).catch(() => {});
    const route = getMeta(n.type).route;
    if (route) navigate(route);
  };

  const confirmDelete = () => {
    const kind = confirm;
    setConfirm(null);
    run(async () => {
      if (kind === "selected") {
        await runBatch(selected, (b, ref) => b.delete(ref));
        setSelected([]);
      } else {
        const snap = await getDocs(query(collection(db, COL), where("isRead", "==", true)));
        await runBatch(
          snap.docs.map((d) => d.id),
          (b, ref) => b.delete(ref)
        );
      }
      fetchTotal(setTotal);
    }, "Deleted");
  };

  const exportCsv = () => {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = filtered.map((n) => [
      n.title || "",
      n.message || "",
      getMeta(n.type).label,
      n.isRead ? "Read" : "Unread",
      fullDate(msOf(n))
    ]);
    const csv = [["Title", "Message", "Type", "Status", "Date"], ...rows]
      .map((r) => r.map(esc).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notifications_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ msg: "CSV exported", sev: "success" });
  };

  const toggleSelect = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const allSelected = filtered.length > 0 && filtered.every((n) => selected.includes(n.id));
  const someSelected = selected.length > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected([]);
    else setSelected(filtered.map((n) => n.id));
  };

  const filtersActive = tab !== 0 || typeFilter !== "all" || range !== "all" || search.trim() !== "";

  const readPct = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;

  const stats = [
    {
      label: "Total",
      value: totalCount,
      color: "#3B82F6",
      Icon: NotificationsIcon,
      helper: weekCount > 0 ? `+${weekCount} this week` : "No activity this week",
      up: weekCount > 0
    },
    {
      label: "Unread",
      value: unread,
      color: "#F43F5E",
      Icon: MarkEmailUnreadOutlinedIcon,
      helper: unread === 0 ? "No unread" : "Needs attention"
    },
    {
      label: "Read",
      value: readCount,
      color: "#22C55E",
      Icon: VisibilityIcon,
      helper: totalCount > 0 ? `${readPct}% read` : "Nothing yet"
    },
    {
      label: "This Week",
      value: weekCount,
      color: "#8B5CF6",
      Icon: AccessTimeIcon,
      helper: weekCount > 0 ? "New activities" : "No new activity"
    }
  ];

  const tabs = [
    { label: "All", count: totalCount },
    { label: "Unread", count: unread },
    { label: "Read", count: readCount }
  ];

  const quickBtn = {
    ...btnSx,
    justifyContent: "flex-start",
    px: 1.75,
    py: 1.1,
    color: "#E2E8F0",
    bgcolor: "#0B1220",
    border: "1px solid #232B45",
    "&:hover": { bgcolor: "#161D2E", borderColor: `${ACCENT}88`, boxShadow: `0 0 14px ${ACCENT}33` },
    "&.Mui-disabled": { color: "#475569", borderColor: "#1C2333" }
  };

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        "@keyframes fadeUp": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "none" }
        }
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#818CF8",
              bgcolor: "rgba(99,102,241,0.14)",
              border: `1px solid ${ACCENT}66`,
              boxShadow: `0 0 20px ${ACCENT}40`
            }}
          >
            <NotificationsIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#F1F5F9", lineHeight: 1.15 }}>Notifications</Typography>
            <Typography sx={{ fontSize: 13.5, color: "#8B96AB", mt: 0.5 }}>
              Stay updated with the latest activity across your platform.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography
            onClick={() => navigate("/")}
            sx={{ fontSize: 13, color: "#8B96AB", cursor: "pointer", "&:hover": { color: "#C7D2FE" } }}
          >
            Dashboard
          </Typography>
          <NavigateNextIcon sx={{ fontSize: 16, color: "#5B6678" }} />
          <Typography sx={{ fontSize: 13, color: "#F1F5F9", fontWeight: 600 }}>Notifications</Typography>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2, mb: 2.5 }}>
        {stats.map((s) => (
          <Box key={s.label} sx={{ ...glowCard(s.color), p: 2.25, display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: "12px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: s.color,
                bgcolor: `${s.color}22`,
                border: `1px solid ${s.color}55`,
                boxShadow: `0 0 16px ${s.color}33`
              }}
            >
              <s.Icon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 13, color: "#A5B0C5" }}>{s.label}</Typography>
              <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#F1F5F9", lineHeight: 1.2 }}>{s.value}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: s.up ? "#22C55E" : "#8B96AB" }}>
                {s.up && <ArrowUpwardIcon sx={{ fontSize: 13 }} />}
                <Typography sx={{ fontSize: 12, color: "inherit" }}>{s.helper}</Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Main grid */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 290px" }, gap: 2, alignItems: "start" }}>
        {/* Left column */}
        <Box sx={{ minWidth: 0 }}>
          {/* Toolbar */}
          <Box sx={{ ...panel, p: 1.75, mb: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
              {tabs.map((t, i) => {
                const active = tab === i;
                return (
                  <Box
                    key={t.label}
                    onClick={() => setTab(i)}
                    sx={{
                      px: 1.75,
                      py: 0.85,
                      borderRadius: R.field,
                      cursor: "pointer",
                      userSelect: "none",
                      fontSize: 13.5,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: active ? "#F1F5F9" : "#8B96AB",
                      bgcolor: active ? "rgba(99,102,241,0.16)" : "transparent",
                      border: `1px solid ${active ? ACCENT : "transparent"}`,
                      boxShadow: active ? `0 0 14px ${ACCENT}55` : "none",
                      transition: "all .15s ease",
                      "&:hover": { color: "#F1F5F9" }
                    }}
                  >
                    {t.label}
                    <Box
                      component="span"
                      sx={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        minWidth: 22,
                        textAlign: "center",
                        px: 0.75,
                        py: "1px",
                        borderRadius: "8px",
                        bgcolor: active ? ACCENT : "#161D2E",
                        color: active ? "#fff" : "#8B96AB"
                      }}
                    >
                      {t.count}
                    </Box>
                  </Box>
                );
              })}

              <Box sx={{ flex: 1 }} />

              <TextField
                size="small"
                placeholder="Search notifications"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ ...fieldSx, minWidth: 220 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: "#5B6678" }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <IconButton size="small" onClick={() => setSearch("")}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  ) : null
                }}
              />
              <TextField
                select
                size="small"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                sx={{ ...fieldSx, minWidth: 130 }}
                SelectProps={{ MenuProps: menuProps }}
              >
                <MenuItem value="all">All time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
                sx={{ ...fieldSx, minWidth: 135 }}
                SelectProps={{ MenuProps: menuProps }}
              >
                <MenuItem value="desc">Newest first</MenuItem>
                <MenuItem value="asc">Oldest first</MenuItem>
              </TextField>
            </Box>

            {Object.keys(typeCounts).length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                <Chip
                  label={`All types (${items.length})`}
                  size="small"
                  onClick={() => setTypeFilter("all")}
                  sx={{
                    height: 30,
                    borderRadius: R.field,
                    fontWeight: 600,
                    bgcolor: typeFilter === "all" ? "rgba(99,102,241,0.16)" : "#0B1220",
                    color: typeFilter === "all" ? "#C7D2FE" : "#8B96AB",
                    border: `1px solid ${typeFilter === "all" ? ACCENT : "#232B45"}`,
                    boxShadow: typeFilter === "all" ? `0 0 12px ${ACCENT}44` : "none"
                  }}
                />
                {Object.keys(typeCounts).map((t) => {
                  const meta = getMeta(t);
                  const active = typeFilter === t;
                  return (
                    <Chip
                      key={t}
                      size="small"
                      icon={<meta.Icon sx={{ fontSize: 16, color: `${meta.color} !important` }} />}
                      label={`${meta.label} (${typeCounts[t]})`}
                      onClick={() => setTypeFilter(active ? "all" : t)}
                      sx={{
                        height: 30,
                        borderRadius: R.field,
                        fontWeight: 600,
                        bgcolor: active ? `${meta.color}26` : "#0B1220",
                        color: active ? meta.color : "#A5B0C5",
                        border: `1px solid ${active ? meta.color : "#232B45"}`,
                        boxShadow: active ? `0 0 12px ${meta.color}44` : "none"
                      }}
                    />
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Bulk bar */}
          {selected.length > 0 && (
            <Box
              sx={{
                ...panel,
                mb: 2,
                px: 2,
                py: 1,
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
                borderColor: `${ACCENT}88`,
                animation: "fadeUp .2s ease both"
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: "#C7D2FE", mr: 1 }}>
                {selected.length} selected
              </Typography>
              <Button size="small" startIcon={<MarkEmailReadOutlinedIcon />} disabled={busy} onClick={() => setRead(selected, true)} sx={btnSx}>
                Mark read
              </Button>
              <Button size="small" startIcon={<MarkEmailUnreadOutlinedIcon />} disabled={busy} onClick={() => setRead(selected, false)} sx={btnSx}>
                Mark unread
              </Button>
              <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} disabled={busy} onClick={() => setConfirm("selected")} sx={btnSx}>
                Delete
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button size="small" onClick={() => setSelected([])} sx={{ ...btnSx, color: "#8B96AB" }}>
                Clear
              </Button>
            </Box>
          )}

          {/* List */}
          <Box sx={{ ...panel, overflow: "hidden" }}>
            <Box sx={{ display: "flex", alignItems: "center", px: 1.5, py: 1, borderBottom: "1px solid #232B45" }}>
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={someSelected}
                onChange={toggleAll}
                disabled={filtered.length === 0}
                sx={{ color: "#475569", "&.Mui-checked, &.MuiCheckbox-indeterminate": { color: "#818CF8" } }}
              />
              <Typography sx={{ fontSize: 13, color: "#A5B0C5", ml: 0.5 }}>
                {filtered.length} {filtered.length === 1 ? "notification" : "notifications"}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                startIcon={<DoneAllIcon />}
                disabled={unread === 0 || busy}
                onClick={() => run(markAllRead, "All marked as read")}
                sx={{ ...btnSx, color: "#C7D2FE", border: "1px solid #232B45", bgcolor: "#0B1220" }}
              >
                Mark all as read
              </Button>
            </Box>

            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ display: "flex", gap: 1.5, px: 2, py: 2, borderTop: i ? "1px solid #161D2E" : "none" }}>
                  <Skeleton variant="rounded" width={44} height={44} sx={{ bgcolor: "#161D2E", borderRadius: "12px" }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton width="35%" sx={{ bgcolor: "#161D2E" }} />
                    <Skeleton width="65%" sx={{ bgcolor: "#161D2E" }} />
                  </Box>
                </Box>
              ))
            ) : groups.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={8}>
                <InboxOutlinedIcon sx={{ fontSize: 40, color: "#5B6678" }} />
                <Typography sx={{ color: "#F1F5F9", fontWeight: 600 }}>
                  {filtersActive ? "No matching notifications" : "You're all caught up"}
                </Typography>
                <Typography sx={{ color: "#8B96AB", fontSize: 13 }}>
                  {filtersActive ? "Try changing or clearing the filters." : "New activity will appear here instantly."}
                </Typography>
                {filtersActive && (
                  <Button
                    size="small"
                    onClick={() => {
                      setTab(0);
                      setTypeFilter("all");
                      setRange("all");
                      setSearch("");
                    }}
                    sx={{ ...btnSx, mt: 0.5 }}
                  >
                    Clear filters
                  </Button>
                )}
              </Box>
            ) : (
              groups.map((g) => (
                <Box key={g.label}>
                  <Box
                    sx={{
                      px: 2,
                      py: 0.9,
                      display: "flex",
                      justifyContent: "space-between",
                      bgcolor: "#0D1424",
                      borderTop: "1px solid #161D2E"
                    }}
                  >
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#7C87A0" }}>
                      {g.label}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: "#5B6678" }}>{g.items.length} items</Typography>
                  </Box>

                  {g.items.map((n, i) => {
                    const meta = getMeta(n.type);
                    const sel = selected.includes(n.id);
                    const ms = msOf(n);
                    let bg = "transparent";
                    if (sel) bg = "rgba(99,102,241,0.14)";
                    else if (!n.isRead) bg = "rgba(99,102,241,0.05)";

                    return (
                      <Box
                        key={n.id}
                        onClick={() => openItem(n)}
                        sx={{
                          position: "relative",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1.5,
                          pl: 1,
                          pr: 1.5,
                          py: 1.75,
                          cursor: "pointer",
                          borderTop: "1px solid #161D2E",
                          bgcolor: bg,
                          transition: "background-color .15s ease",
                          animation: "fadeUp .3s ease both",
                          animationDelay: `${Math.min(i, 10) * 0.03}s`,
                          "&:hover": { bgcolor: "#161D2E" },
                          "&:hover .row-actions, &:focus-within .row-actions": { opacity: 1 },
                          "&::before": {
                            content: '""',
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 3,
                            bgcolor: n.isRead ? "transparent" : meta.color
                          }
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={sel}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelect(n.id)}
                          sx={{ mt: 0.75, color: "#475569", "&.Mui-checked": { color: "#818CF8" } }}
                        />
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: "12px",
                            bgcolor: `${meta.color}1F`,
                            color: meta.color,
                            border: `1px solid ${meta.color}44`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}
                        >
                          <meta.Icon sx={{ fontSize: 22 }} />
                        </Box>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography sx={{ fontSize: 14.5, fontWeight: n.isRead ? 500 : 700, color: "#F1F5F9" }}>
                              {n.title || "Notification"}
                            </Typography>
                            {!n.isRead && (
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: ACCENT, boxShadow: `0 0 8px ${ACCENT}`, flexShrink: 0 }} />
                            )}
                          </Box>
                          <Typography sx={{ fontSize: 13.5, color: "#A5B0C5", mt: 0.25 }}>{n.message}</Typography>
                          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mt: 0.9 }}>
                            <Chip
                              label={meta.label}
                              size="small"
                              sx={{
                                height: 22,
                                borderRadius: "6px",
                                fontSize: 11.5,
                                fontWeight: 600,
                                bgcolor: `${meta.color}1A`,
                                color: meta.color
                              }}
                            />
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#7C87A0" }}>
                              <AccessTimeIcon sx={{ fontSize: 13 }} />
                              <Typography sx={{ fontSize: 12, color: "inherit" }}>
                                {timeAgo(ms)}
                                {toMillis(n.createdAt) ? `  |  ${fullDate(ms)}` : ""}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        <Box className="row-actions" sx={{ display: "flex", alignItems: "center", flexShrink: 0, opacity: 0, transition: "opacity .15s ease" }}>
                          <Tooltip title={n.isRead ? "Mark as unread" : "Mark as read"}>
                            <IconButton
                              size="small"
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleOne(n);
                              }}
                              sx={{ borderRadius: R.chip, color: "#8B96AB", "&:hover": { color: "#818CF8", bgcolor: "#1E2540" } }}
                            >
                              {n.isRead ? <MarkEmailUnreadOutlinedIcon fontSize="small" /> : <MarkEmailReadOutlinedIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteOne(n);
                              }}
                              sx={{ borderRadius: R.chip, color: "#8B96AB", "&:hover": { color: "#EF4444", bgcolor: "rgba(239,68,68,0.12)" } }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        {meta.route && <ChevronRightIcon sx={{ color: "#5B6678", alignSelf: "center", flexShrink: 0 }} />}
                      </Box>
                    );
                  })}
                </Box>
              ))
            )}

            {!loading && items.length > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, py: 1.75, borderTop: "1px solid #161D2E" }}>
                <Typography sx={{ fontSize: 12.5, color: "#5B6678" }}>
                  Showing {items.length}
                  {total > 0 ? ` of ${total}` : ""}
                </Typography>
                {hasMore && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setPageSize((p) => p + PAGE)}
                    sx={{ ...btnSx, borderColor: "#2A3350", color: "#C7D2FE" }}
                  >
                    Load more
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Right column: Quick Actions */}
        <Box sx={{ ...panel, p: 2.25, position: { lg: "sticky" }, top: { lg: 90 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <FlashOnIcon sx={{ color: "#818CF8" }} />
            <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#F1F5F9" }}>Quick Actions</Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Button
              fullWidth
              startIcon={<DoneAllIcon sx={{ color: "#818CF8" }} />}
              disabled={unread === 0 || busy}
              onClick={() => run(markAllRead, "All marked as read")}
              sx={quickBtn}
            >
              Mark all as read
            </Button>
            <Button
              fullWidth
              startIcon={<DeleteOutlineIcon sx={{ color: selected.length ? "#EF4444" : "inherit" }} />}
              disabled={selected.length === 0 || busy}
              onClick={() => setConfirm("selected")}
              sx={quickBtn}
            >
              {selected.length > 0 ? `Delete selected (${selected.length})` : "Delete selected"}
            </Button>
            <Button
              fullWidth
              startIcon={<DeleteOutlineIcon sx={{ color: readCount ? "#F59E0B" : "inherit" }} />}
              disabled={readCount === 0 || busy}
              onClick={() => setConfirm("read")}
              sx={quickBtn}
            >
              Delete all read
            </Button>
            <Button
              fullWidth
              startIcon={<DownloadIcon sx={{ color: filtered.length ? "#22C55E" : "inherit" }} />}
              disabled={filtered.length === 0}
              onClick={exportCsv}
              sx={quickBtn}
            >
              Export CSV
            </Button>
          </Box>
          <Typography sx={{ fontSize: 11.5, color: "#5B6678", mt: 1.75 }}>
            Export uses the current filters and search.
          </Typography>
        </Box>
      </Box>

      {/* Confirm delete */}
      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        PaperProps={{ sx: { bgcolor: "#101526", border: "1px solid #232B45", borderRadius: R.card, color: "#fff" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete notifications?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#8B96AB" }}>
            {confirm === "selected"
              ? `${selected.length} selected notification(s) will be permanently deleted.`
              : "All read notifications will be permanently deleted. This cannot be undone."}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirm(null)} sx={{ ...btnSx, color: "#8B96AB" }}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" sx={btnSx}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.sev} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: R.field }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

export default Notifications;
