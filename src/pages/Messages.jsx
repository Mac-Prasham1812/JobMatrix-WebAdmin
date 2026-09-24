import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  Autocomplete,
  createFilterOptions,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  IconButton
} from "@mui/material";

import SendIcon from "@mui/icons-material/Send";
import PeopleIcon from "@mui/icons-material/People";
import SchoolIcon from "@mui/icons-material/School";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import SearchIcon from "@mui/icons-material/Search";

import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { toMillis, timeAgo, fullDate } from "../utils/notificationUtils";

const API_BASE = "https://jobmatrix-backend-cd5v.onrender.com";

const TITLE_MAX = 80;
const MSG_MAX = 500;
const DAY = 86400000;
const ACCENT = "#6366F1";
const R = { card: "14px", field: "10px", chip: "8px", tile: "10px" };

const AVATAR_COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EC4899", "#3B82F6", "#A855F7", "#14B8A6", "#EF4444"];
const colorForUid = (uid = "") => {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const panel = {
  bgcolor: "#101526",
  border: "1px solid #232B45",
  borderRadius: R.card,
  boxShadow: "0 8px 30px rgba(0,0,0,0.25)"
};

const glowCard = (c) => ({
  borderRadius: R.card,
  border: `1px solid ${c}55`,
  background: `linear-gradient(135deg, ${c}26 0%, #101526 65%)`,
  boxShadow: `0 0 22px ${c}1F`,
  transition: "box-shadow .2s ease, transform .2s ease",
  "&:hover": { boxShadow: `0 0 30px ${c}40`, transform: "translateY(-2px)" }
});

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: R.field, bgcolor: "#0B1220", fontSize: 14 },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#232B45" }
};

const btnSx = { textTransform: "none", fontWeight: 600, borderRadius: R.field };

const AUDIENCES = [
  { key: "all", label: "All users", Icon: PeopleIcon },
  { key: "students", label: "Students", Icon: SchoolIcon },
  { key: "employers", label: "Employers", Icon: BusinessIcon },
  { key: "user", label: "Specific user", Icon: PersonIcon }
];

const TABS = [
  { key: "compose", label: "Compose", Icon: SendIcon },
  { key: "inbox", label: "Inbox", Icon: InboxOutlinedIcon }
];

const audienceLabel = (m) => {
  if (m.audience === "user") return m.targetName || "Specific user";
  const a = AUDIENCES.find((x) => x.key === m.audience);
  return a ? a.label : m.audience;
};

const userFilter = createFilterOptions({
  stringify: (u) => `${u.name || ""} ${u.email || ""}`
});

function Messages() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("compose");

  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [audience, setAudience] = useState("all");
  const [target, setTarget] = useState(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const [tick, setTick] = useState(0);

  // --- Inbox state ---
  const [supportMsgs, setSupportMsgs] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [selectedUid, setSelectedUid] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [inboxSearch, setInboxSearch] = useState("");
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [inboxRoleFilter, setInboxRoleFilter] = useState("All");

  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snap) => {
        const list = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() }))
          .filter((u) => (u.role === "Student" || u.role === "Employer") && u.isDisabled !== true);
        setUsers(list);
      })
      .catch((e) => console.log("Load users error:", e));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "adminMessages"), orderBy("createdAt", "desc"), limit(200));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingHistory(false);
      },
      () => setLoadingHistory(false)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      where("type", "==", "AdminMessage"),
      orderBy("createdAt", "asc"),
      limit(1000)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSupportMsgs(snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() })));
        setLoadingInbox(false);
      },
      (e) => {
        console.log("Inbox load error:", e);
        setLoadingInbox(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const userByUid = useMemo(() => {
    const map = {};
    users.forEach((u) => (map[u.uid] = u));
    return map;
  }, [users]);

  const studentCount = useMemo(() => users.filter((u) => u.role === "Student").length, [users]);
  const employerCount = useMemo(() => users.filter((u) => u.role === "Employer").length, [users]);

  let recipientCount = 0;
  if (audience === "all") recipientCount = studentCount + employerCount;
  else if (audience === "students") recipientCount = studentCount;
  else if (audience === "employers") recipientCount = employerCount;
  else if (target) recipientCount = 1;

  const canSend = title.trim() !== "" && message.trim() !== "" && recipientCount > 0 && !sending;

  const stats = useMemo(() => {
    const cutoff = Date.now() - 7 * DAY;
    let week = 0;
    let students = 0;
    let employers = 0;
    history.forEach((m) => {
      if ((toMillis(m.createdAt) || Date.now()) >= cutoff) week += 1;
      students += m.studentCount || 0;
      employers += m.employerCount || 0;
    });
    return [
      { label: "Messages Sent", value: history.length, color: "#3B82F6", Icon: SendIcon, helper: "All time" },
      { label: "This Week", value: week, color: "#8B5CF6", Icon: AccessTimeIcon, helper: "Last 7 days" },
      { label: "Students Reached", value: students, color: "#22C55E", Icon: SchoolIcon, helper: "Total deliveries" },
      { label: "Employers Reached", value: employers, color: "#F59E0B", Icon: BusinessIcon, helper: "Total deliveries" }
    ];
  }, [history]);

  const conversations = useMemo(() => {
    const map = {};
    supportMsgs.forEach((m) => {
      const uid = m.recipientId;
      if (!uid) return;
      if (!map[uid]) map[uid] = { uid, messages: [], unread: 0 };
      map[uid].messages.push(m);
      if (m.sender === "user" && m.adminRead !== true) map[uid].unread += 1;
    });
    return Object.values(map)
      .map((c) => {
        const last = c.messages[c.messages.length - 1];
        return { ...c, lastMessage: last?.message || "", lastAt: toMillis(last?.createdAt) };
      })
      .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
  }, [supportMsgs]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const u = userByUid[c.uid];
      if (inboxRoleFilter !== "All" && u?.role !== inboxRoleFilter) return false;
      if (inboxSearch.trim()) {
        const q = inboxSearch.trim().toLowerCase();
        const hay = `${u?.name || ""} ${u?.email || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [conversations, userByUid, inboxSearch, inboxRoleFilter]);

  const threadMessages = useMemo(() => {
    if (!selectedUid) return [];
    return supportMsgs
      .filter((m) => m.recipientId === selectedUid)
      .sort((a, b) => (toMillis(a.createdAt) || 0) - (toMillis(b.createdAt) || 0));
  }, [supportMsgs, selectedUid]);

  const totalUnread = useMemo(() => conversations.reduce((s, c) => s + c.unread, 0), [conversations]);

  const selectConversation = async (uid) => {
    setSelectedUid(uid);
    const unreadDocs = supportMsgs.filter(
      (m) => m.recipientId === uid && m.sender === "user" && m.adminRead !== true
    );
    if (unreadDocs.length === 0) return;
    try {
      const batch = writeBatch(db);
      unreadDocs.forEach((m) => batch.update(m.ref, { adminRead: true }));
      await batch.commit();
    } catch (e) {
      console.log("Mark read error:", e);
    }
  };

  const sendReply = async () => {
    const text = replyText.trim();
    if (!text || !selectedUid || sendingReply) return;
    setSendingReply(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/admin/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ audience: "user", userId: selectedUid, title: "Support", message: text })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send reply");
      setReplyText("");
    } catch (e) {
      setToast({ msg: e.message || "Failed to send reply", sev: "error" });
    } finally {
      setSendingReply(false);
    }
  };

  const doSend = async () => {
    setConfirm(false);
    setSending(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/admin/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          audience,
          userId: target ? target.uid : undefined,
          title: title.trim(),
          message: message.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setToast({ msg: `Sent to ${data.recipientCount} user(s). Push delivered: ${data.pushSuccess}`, sev: "success" });
      setTitle("");
      setMessage("");
      setTarget(null);
    } catch (e) {
      setToast({ msg: e.message || "Failed to send message", sev: "error" });
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (audience === "user") doSend();
    else setConfirm(true);
  };

  const recipientSummary = () => {
    if (audience === "user") return target ? `To: ${target.name || target.email}` : "Select a user";
    return `${recipientCount} recipient${recipientCount === 1 ? "" : "s"}`;
  };

  const selectedUser = selectedUid ? userByUid[selectedUid] : null;
  const joinedText = selectedUser?.createdAt ? fullDate(toMillis(selectedUser.createdAt)) : "—";

  return (
    <Box
      sx={{
        maxWidth: 1300,
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
              width: 56, height: 56, borderRadius: "14px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#818CF8", bgcolor: "rgba(99,102,241,0.14)",
              border: `1px solid ${ACCENT}66`, boxShadow: `0 0 20px ${ACCENT}40`
            }}
          >
            <SendIcon sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#F1F5F9", lineHeight: 1.15 }}>Messages</Typography>
            <Typography sx={{ fontSize: 13.5, color: "#8B96AB", mt: 0.5 }}>
              Communicate with students and employers, or send announcements.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography onClick={() => navigate("/")} sx={{ fontSize: 13, color: "#8B96AB", cursor: "pointer", "&:hover": { color: "#C7D2FE" } }}>
            Dashboard
          </Typography>
          <NavigateNextIcon sx={{ fontSize: 16, color: "#5B6678" }} />
          <Typography sx={{ fontSize: 13, color: "#F1F5F9", fontWeight: 600 }}>Messages</Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ display: "flex", gap: 1, mb: 2.5 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Box
              key={t.key}
              onClick={() => setTab(t.key)}
              sx={{
                px: 2, py: 1, borderRadius: R.field, cursor: "pointer", userSelect: "none",
                display: "flex", alignItems: "center", gap: 1, fontSize: 14, fontWeight: 600,
                color: active ? "#F1F5F9" : "#8B96AB",
                bgcolor: active ? "rgba(99,102,241,0.16)" : "#0B1220",
                border: `1px solid ${active ? ACCENT : "#232B45"}`,
                boxShadow: active ? `0 0 14px ${ACCENT}55` : "none",
                transition: "all .15s ease", "&:hover": { color: "#F1F5F9" }
              }}
            >
              <t.Icon sx={{ fontSize: 18, color: active ? "#818CF8" : "inherit" }} />
              {t.label}
              {t.key === "inbox" && totalUnread > 0 && (
                <Chip label={totalUnread} size="small" sx={{ height: 18, fontSize: 10.5, fontWeight: 700, bgcolor: "#EF4444", color: "#fff", ml: 0.25 }} />
              )}
            </Box>
          );
        })}
      </Box>

      {tab === "compose" ? (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2, mb: 2.5 }}>
            {stats.map((s) => (
              <Box key={s.label} sx={{ ...glowCard(s.color), p: 2.25, display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ width: 52, height: 52, borderRadius: "12px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, bgcolor: `${s.color}22`, border: `1px solid ${s.color}55`, boxShadow: `0 0 16px ${s.color}33` }}>
                  <s.Icon sx={{ fontSize: 26 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 13, color: "#A5B0C5" }}>{s.label}</Typography>
                  <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#F1F5F9", lineHeight: 1.2 }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: 12, color: "#8B96AB" }}>{s.helper}</Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 360px" }, gap: 2, alignItems: "start", mb: 2.5 }}>
            <Box sx={{ ...panel, p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#F1F5F9", mb: 1.5 }}>Compose message</Typography>

              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#8B96AB", mb: 1 }}>Audience</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {AUDIENCES.map((a) => {
                  const active = audience === a.key;
                  return (
                    <Box
                      key={a.key}
                      onClick={() => { setAudience(a.key); if (a.key !== "user") setTarget(null); }}
                      sx={{
                        px: 1.75, py: 0.9, borderRadius: R.field, cursor: "pointer", userSelect: "none",
                        display: "flex", alignItems: "center", gap: 0.9, fontSize: 13.5, fontWeight: 600,
                        color: active ? "#F1F5F9" : "#8B96AB",
                        bgcolor: active ? "rgba(99,102,241,0.16)" : "#0B1220",
                        border: `1px solid ${active ? ACCENT : "#232B45"}`,
                        boxShadow: active ? `0 0 14px ${ACCENT}55` : "none",
                        transition: "all .15s ease", "&:hover": { color: "#F1F5F9" }
                      }}
                    >
                      <a.Icon sx={{ fontSize: 18, color: active ? "#818CF8" : "inherit" }} />
                      {a.label}
                    </Box>
                  );
                })}
              </Box>

              {audience === "user" && (
                <Box sx={{ mb: 2 }}>
                  <Autocomplete
                    options={users}
                    value={target}
                    onChange={(e, v) => setTarget(v)}
                    filterOptions={userFilter}
                    getOptionLabel={(u) => u.name || u.email || u.uid}
                    isOptionEqualToValue={(a, b) => a.uid === b.uid}
                    noOptionsText="No users found"
                    renderOption={(props, u) => {
                      const { key, ...rest } = props;
                      return (
                        <Box component="li" key={key} {...rest} sx={{ display: "flex", gap: 1.25 }}>
                          <Avatar src={u.photoUrl || undefined} sx={{ width: 28, height: 28, fontSize: 13 }}>
                            {(u.name || "?").charAt(0).toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13.5 }}>{u.name || u.email}</Typography>
                            {u.email && <Typography sx={{ fontSize: 11.5, color: "#8B96AB" }}>{u.email}</Typography>}
                          </Box>
                          <Chip label={u.role} size="small" sx={{ height: 20, borderRadius: "6px", fontSize: 11 }} />
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField {...params} size="small" placeholder="Search student or employer by name or email" sx={fieldSx} />
                    )}
                  />
                </Box>
              )}

              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#8B96AB", mb: 1 }}>Title</Typography>
              <TextField
                fullWidth size="small" placeholder="e.g. Scheduled maintenance tonight"
                value={title} onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                sx={{ ...fieldSx, mb: 0.5 }}
              />
              <Typography sx={{ fontSize: 11.5, color: "#5B6678", textAlign: "right", mb: 1.75 }}>{title.length}/{TITLE_MAX}</Typography>

              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#8B96AB", mb: 1 }}>Message</Typography>
              <TextField
                fullWidth multiline minRows={5} maxRows={10} placeholder="Write your message"
                value={message} onChange={(e) => setMessage(e.target.value.slice(0, MSG_MAX))}
                sx={{ ...fieldSx, mb: 0.5 }}
              />
              <Typography sx={{ fontSize: 11.5, color: "#5B6678", textAlign: "right", mb: 2 }}>{message.length}/{MSG_MAX}</Typography>

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
                <Typography sx={{ fontSize: 13, color: "#A5B0C5" }}>{recipientSummary()}</Typography>
                <Button
                  variant="contained" disabled={!canSend} onClick={handleSend}
                  startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  sx={{ ...btnSx, px: 3, py: 1, bgcolor: ACCENT, boxShadow: canSend ? `0 0 18px ${ACCENT}66` : "none", "&:hover": { bgcolor: "#4F46E5" } }}
                >
                  {sending ? "Sending..." : "Send message"}
                </Button>
              </Box>
            </Box>

            <Box sx={{ ...panel, p: 2.25, position: { lg: "sticky" }, top: { lg: 90 } }}>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#F1F5F9" }}>Live preview</Typography>
              <Typography sx={{ fontSize: 12, color: "#5B6678", mb: 1.5 }}>How it appears on the user's phone</Typography>

              <Box sx={{ p: 1.75, display: "flex", gap: 1.5, borderRadius: R.card, bgcolor: "#0B1220", border: "1px solid #232B45" }}>
                <Avatar sx={{ width: 38, height: 38, fontWeight: 700, background: "linear-gradient(135deg, #6366F1, #A855F7)" }}>J</Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 12, color: "#8B96AB" }}>JobMatrix Support</Typography>
                    <Typography sx={{ fontSize: 12, color: "#5B6678" }}>now</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: title ? "#F1F5F9" : "#475569", wordBreak: "break-word" }}>
                    {title || "Message title"}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: message ? "#A5B0C5" : "#475569", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {message || "Your message will appear here."}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.75 }}>
                <Chip label={audience === "user" ? "Direct message" : "Announcement"} size="small" sx={{ height: 24, borderRadius: R.chip, bgcolor: "rgba(99,102,241,0.16)", color: "#C7D2FE", fontWeight: 600 }} />
                <Chip label={recipientSummary()} size="small" sx={{ height: 24, borderRadius: R.chip, bgcolor: "#0B1220", color: "#A5B0C5", border: "1px solid #232B45" }} />
              </Box>
            </Box>
          </Box>

          <Box sx={{ ...panel, overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid #232B45" }}>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#F1F5F9" }}>Recent messages</Typography>
            </Box>

            {loadingHistory ? (
              <Box display="flex" justifyContent="center" py={5}><CircularProgress size={24} /></Box>
            ) : history.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={6}>
                <InboxOutlinedIcon sx={{ fontSize: 36, color: "#5B6678" }} />
                <Typography sx={{ color: "#8B96AB", fontSize: 13 }}>No messages sent yet.</Typography>
              </Box>
            ) : (
              history.slice(0, 20).map((m, i) => {
                const ms = toMillis(m.createdAt);
                return (
                  <Box
                    key={m.id}
                    sx={{
                      px: 2.5, py: 1.75, display: "flex", alignItems: "flex-start", gap: 1.75,
                      borderTop: i ? "1px solid #161D2E" : "none",
                      animation: "fadeUp .3s ease both", animationDelay: `${Math.min(i, 10) * 0.03}s`,
                      "&:hover": { bgcolor: "#161D2E" }
                    }}
                  >
                    <Box sx={{ width: 40, height: 40, borderRadius: "12px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#818CF8", bgcolor: "rgba(99,102,241,0.14)", border: `1px solid ${ACCENT}44` }}>
                      <SendIcon sx={{ fontSize: 19 }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: "#F1F5F9" }}>{m.title}</Typography>
                      <Typography sx={{ fontSize: 13, color: "#A5B0C5", mt: 0.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>
                        {m.message}
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mt: 0.9 }}>
                        <Chip label={audienceLabel(m)} size="small" sx={{ height: 22, borderRadius: "6px", fontSize: 11.5, fontWeight: 600, bgcolor: "rgba(99,102,241,0.16)", color: "#C7D2FE" }} />
                        <Chip label={`${m.recipientCount || 0} recipient${m.recipientCount === 1 ? "" : "s"}`} size="small" sx={{ height: 22, borderRadius: "6px", fontSize: 11.5, bgcolor: "#0B1220", color: "#A5B0C5", border: "1px solid #232B45" }} />
                        {typeof m.pushSuccess === "number" && (
                          <Chip label={`Push ${m.pushSuccess}/${m.pushTokens || 0}`} size="small" sx={{ height: 22, borderRadius: "6px", fontSize: 11.5, bgcolor: "rgba(34,197,94,0.12)", color: "#22C55E" }} />
                        )}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#7C87A0" }}>
                          <AccessTimeIcon sx={{ fontSize: 13 }} />
                          <Typography sx={{ fontSize: 12, color: "inherit" }}>{timeAgo(ms)}{ms ? `  |  ${fullDate(ms)}` : ""}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </>
      ) : (
        /* --- INBOX TAB --- */
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: selectedUid ? "300px 1fr 260px" : "300px 1fr" },
            gap: 2,
            minHeight: { md: 480 },
            maxHeight: { md: 660 }
          }}
        >
          {/* Conversation list */}
          <Box sx={{ ...panel, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: { md: 660 } }}>
            <Box sx={{ px: 2, pt: 1.75, pb: 1.25, borderBottom: "1px solid #232B45" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#F1F5F9" }}>Conversations</Typography>
                <IconButton
                  size="small"
                  onClick={() => setShowSearchBox((v) => !v)}
                  sx={{
                    color: showSearchBox ? "#818CF8" : "#8B96AB",
                    bgcolor: showSearchBox ? "rgba(99,102,241,0.16)" : "transparent",
                    "&:hover": { bgcolor: "rgba(99,102,241,0.16)", color: "#818CF8" }
                  }}
                >
                  <SearchIcon sx={{ fontSize: 19 }} />
                </IconButton>
              </Box>
              {showSearchBox && (
                <TextField
                  fullWidth size="small" placeholder="Search by name or email..." autoFocus
                  value={inboxSearch} onChange={(e) => setInboxSearch(e.target.value)}
                  sx={{ ...fieldSx, mb: 1 }}
                />
              )}
              <Select
                fullWidth size="small" value={inboxRoleFilter}
                onChange={(e) => setInboxRoleFilter(e.target.value)}
                sx={{ ...fieldSx, fontSize: 13, "& .MuiSelect-select": { py: 0.9 } }}
              >
                <MenuItem value="All">All roles</MenuItem>
                <MenuItem value="Student">Students</MenuItem>
                <MenuItem value="Employer">Employers</MenuItem>
              </Select>
            </Box>

            <Box sx={{ overflowY: "auto", flex: 1 }}>
              {loadingInbox ? (
                <Box display="flex" justifyContent="center" py={5}><CircularProgress size={22} /></Box>
              ) : filteredConversations.length === 0 ? (
                <Box sx={{ minHeight: 300, width: "100%", px: 3, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Box component="svg" viewBox="0 0 140 100" sx={{ width: 130, height: 92, mx: "auto", mb: 1, display: "block" }}>
                    <defs>
                      <radialGradient id="glowList" cx="50%" cy="42%" r="60%">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                      </radialGradient>
                      <linearGradient id="bubbleList" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#A5B4FC" />
                        <stop offset="100%" stopColor="#6366F1" />
                      </linearGradient>
                    </defs>
                    <circle cx="70" cy="45" r="48" fill="url(#glowList)" />
                    <path d="M12 78 Q70 58 128 78" stroke="#232B45" strokeWidth="1.5" fill="none" />
                    <rect x="43" y="18" width="54" height="38" rx="11" fill="url(#bubbleList)" />
                    <path d="M58 56 l7 9 l7 -9 Z" fill="url(#bubbleList)" />
                    <circle cx="59" cy="37" r="3" fill="#0B1220" opacity="0.85" />
                    <circle cx="70" cy="37" r="3" fill="#0B1220" opacity="0.85" />
                    <circle cx="81" cy="37" r="3" fill="#0B1220" opacity="0.85" />
                    <path d="M108 22 l4 4 M108 30 l4 -4" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="33" cy="28" r="2.2" fill="#2DD4BF" />
                    <circle cx="25" cy="55" r="1.6" fill="#818CF8" />
                  </Box>
                  <Typography align="center" sx={{ color: "#F1F5F9", fontSize: 15, fontWeight: 700, width: "100%" }}>
                    {conversations.length === 0 ? "No conversations yet" : "No matches"}
                  </Typography>
                  <Typography align="center" sx={{ color: "#8B96AB", fontSize: 12.5, maxWidth: 210, mx: "auto", mt: 0.5, lineHeight: 1.55 }}>
                    {conversations.length === 0
                      ? "Messages from students and employers will appear here."
                      : "Try a different search or filter."}
                  </Typography>
                </Box>
              ) : (
                filteredConversations.map((c) => {
                  const u = userByUid[c.uid];
                  const active = selectedUid === c.uid;
                  const color = colorForUid(c.uid);
                  return (
                    <Box
                      key={c.uid}
                      onClick={() => selectConversation(c.uid)}
                      sx={{
                        px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.25, cursor: "pointer",
                        borderBottom: "1px solid #161D2E",
                        bgcolor: active ? "rgba(99,102,241,0.14)" : "transparent",
                        borderLeft: active ? `3px solid ${ACCENT}` : "3px solid transparent",
                        "&:hover": { bgcolor: active ? "rgba(99,102,241,0.14)" : "#161D2E" }
                      }}
                    >
                      <Avatar src={u?.photoUrl || undefined} sx={{ width: 38, height: 38, fontSize: 14, bgcolor: color, fontWeight: 700 }}>
                        {(u?.name || "?").charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#F1F5F9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {u?.name || u?.email || "Unknown user"}
                          </Typography>
                          <Typography sx={{ fontSize: 10.5, color: "#5B6678", flexShrink: 0 }}>{timeAgo(c.lastAt)}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          {u?.role && (
                            <Chip
                              label={u.role}
                              size="small"
                              sx={{
                                height: 16, fontSize: 9.5, fontWeight: 700, px: 0,
                                bgcolor: u.role === "Student" ? "rgba(59,130,246,0.16)" : "rgba(34,197,94,0.16)",
                                color: u.role === "Student" ? "#60A5FA" : "#4ADE80"
                              }}
                            />
                          )}
                          <Typography sx={{ fontSize: 12, color: "#8B96AB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                            {c.lastMessage}
                          </Typography>
                        </Box>
                      </Box>
                      {c.unread > 0 && (
                        <Chip label={c.unread} size="small" sx={{ height: 18, fontSize: 10.5, fontWeight: 700, bgcolor: "#EF4444", color: "#fff" }} />
                      )}
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>

          {/* Thread */}
          <Box sx={{ ...panel, display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: { md: 660 } }}>
            {!selectedUid ? (
              <Box sx={{ width: "100%", flex: 1, px: 3, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Box component="svg" viewBox="0 0 200 120" sx={{ width: 190, height: 114, mx: "auto", mb: 1, display: "block" }}>
                  <defs>
                    <radialGradient id="glowThread" cx="50%" cy="45%" r="60%">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="bubbleThreadA" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#A78BFA" />
                      <stop offset="100%" stopColor="#7C3AED" />
                    </linearGradient>
                    <linearGradient id="bubbleThreadB" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#818CF8" />
                      <stop offset="100%" stopColor="#4F46E5" />
                    </linearGradient>
                  </defs>
                  <circle cx="100" cy="58" r="56" fill="url(#glowThread)" />
                  <path d="M18 96 Q100 76 182 96" stroke="#232B45" strokeWidth="1.5" fill="none" />
                  <rect x="60" y="22" width="60" height="40" rx="12" fill="url(#bubbleThreadA)" />
                  <circle cx="76" cy="42" r="2.6" fill="#fff" opacity="0.9" />
                  <circle cx="90" cy="42" r="2.6" fill="#fff" opacity="0.9" />
                  <circle cx="104" cy="42" r="2.6" fill="#fff" opacity="0.9" />
                  <rect x="88" y="52" width="52" height="34" rx="11" fill="url(#bubbleThreadB)" />
                  <path d="M100 84 l6 8 l6 -8 Z" fill="url(#bubbleThreadB)" />
                  <circle cx="102" cy="68" r="2.4" fill="#fff" opacity="0.9" />
                  <circle cx="114" cy="68" r="2.4" fill="#fff" opacity="0.9" />
                  <path
                    d="M148 30 l24 -12 l-8 26 l-6 -8 l-10 -6 Z"
                    fill="#818CF8"
                  />
                  <path d="M150 62 Q165 44 172 24" stroke="#2DD4BF" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />
                  <circle cx="40" cy="32" r="2" fill="#2DD4BF" />
                  <path d="M32 46 l4 4 M32 54 l4 -4" stroke="#818CF8" strokeWidth="1.6" strokeLinecap="round" />
                </Box>
                <Typography align="center" sx={{ color: "#F1F5F9", fontSize: 16, fontWeight: 700 }}>
                  Select a conversation
                </Typography>
                <Typography align="center" sx={{ color: "#8B96AB", fontSize: 12.5, maxWidth: 260, mx: "auto", mt: 0.5, lineHeight: 1.55 }}>
                  Choose a conversation from the left panel to start reading and replying.
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ px: 2.25, py: 1.5, borderBottom: "1px solid #232B45", display: "flex", alignItems: "center", gap: 1.25 }}>
                  <Avatar src={selectedUser?.photoUrl || undefined} sx={{ width: 36, height: 36, fontSize: 13.5, bgcolor: colorForUid(selectedUid), fontWeight: 700 }}>
                    {(selectedUser?.name || "?").charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>
                        {selectedUser?.name || selectedUser?.email || selectedUid}
                      </Typography>
                      {selectedUser?.role && (
                        <Chip
                          label={selectedUser.role}
                          size="small"
                          sx={{
                            height: 18, fontSize: 10, fontWeight: 700,
                            bgcolor: selectedUser.role === "Student" ? "rgba(59,130,246,0.16)" : "rgba(34,197,94,0.16)",
                            color: selectedUser.role === "Student" ? "#60A5FA" : "#4ADE80"
                          }}
                        />
                      )}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: selectedUser?.isOnline ? "#22C55E" : "#5B6678" }} />
                      <Typography sx={{ fontSize: 11, color: "#8B96AB" }}>{selectedUser?.isOnline ? "Online" : "Offline"}</Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                  {threadMessages.map((m) => {
                    const isAdmin = m.sender !== "user";
                    return (
                      <Box key={m.id} sx={{ alignSelf: isAdmin ? "flex-end" : "flex-start", maxWidth: "75%", display: "flex", flexDirection: "column", gap: 0.4 }}>
                        <Box sx={{ px: 1.5, py: 1, borderRadius: R.field, bgcolor: isAdmin ? ACCENT : "#0B1220", border: isAdmin ? "none" : "1px solid #232B45", color: isAdmin ? "#fff" : "#E2E8F0", fontSize: 13, wordBreak: "break-word" }}>
                          {m.message}
                        </Box>
                        <Typography sx={{ fontSize: 10.5, color: "#5B6678", textAlign: isAdmin ? "right" : "left" }}>
                          {timeAgo(toMillis(m.createdAt))}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>

                <Box sx={{ p: 1.5, borderTop: "1px solid #232B45", display: "flex", gap: 1, alignItems: "center" }}>
                  <TextField
                    fullWidth size="small" placeholder="Type a reply..."
                    value={replyText} onChange={(e) => setReplyText(e.target.value.slice(0, MSG_MAX))}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    sx={fieldSx}
                  />
                  <Button
                    variant="contained" disabled={!replyText.trim() || sendingReply} onClick={sendReply}
                    sx={{ ...btnSx, minWidth: 44, width: 44, height: 40, p: 0, bgcolor: ACCENT, "&:hover": { bgcolor: "#4F46E5" } }}
                  >
                    {sendingReply ? <CircularProgress size={16} color="inherit" /> : <SendIcon sx={{ fontSize: 18 }} />}
                  </Button>
                </Box>
              </>
            )}
          </Box>

          {/* Profile side panel — only when a conversation is open */}
          {selectedUid && (
            <Box sx={{ ...panel, p: 2, display: { xs: "none", md: "flex" }, flexDirection: "column", gap: 2, maxHeight: { md: 660 }, overflowY: "auto" }}>
              <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                <Avatar src={selectedUser?.photoUrl || undefined} sx={{ width: 64, height: 64, fontSize: 22, bgcolor: colorForUid(selectedUid), fontWeight: 700 }}>
                  {(selectedUser?.name || "?").charAt(0).toUpperCase()}
                </Avatar>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9" }}>{selectedUser?.name || "Unknown"}</Typography>
                {selectedUser?.role && (
                  <Chip
                    label={selectedUser.role}
                    size="small"
                    sx={{
                      height: 20, fontSize: 11, fontWeight: 700,
                      bgcolor: selectedUser.role === "Student" ? "rgba(59,130,246,0.16)" : "rgba(34,197,94,0.16)",
                      color: selectedUser.role === "Student" ? "#60A5FA" : "#4ADE80"
                    }}
                  />
                )}
              </Box>

              <Button
                fullWidth variant="outlined" size="small"
                onClick={() => navigate(selectedUser?.role === "Employer" ? "/employers" : "/students")}
                sx={{ ...btnSx, borderColor: "#232B45", color: "#C7D2FE", "&:hover": { borderColor: ACCENT, bgcolor: "rgba(99,102,241,0.08)" } }}
              >
                View Profile
              </Button>

              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "#8B96AB", mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>About</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box>
                    <Typography sx={{ fontSize: 10.5, color: "#5B6678" }}>Email</Typography>
                    <Typography sx={{ fontSize: 12.5, color: "#E2E8F0", wordBreak: "break-word" }}>{selectedUser?.email || "—"}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 10.5, color: "#5B6678" }}>Joined</Typography>
                    <Typography sx={{ fontSize: 12.5, color: "#E2E8F0" }}>{joinedText}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 10.5, color: "#5B6678" }}>Status</Typography>
                    <Chip
                      label={selectedUser?.isDisabled ? "Disabled" : "Active"}
                      size="small"
                      sx={{
                        height: 20, fontSize: 11, fontWeight: 600, mt: 0.25,
                        bgcolor: selectedUser?.isDisabled ? "rgba(239,68,68,0.14)" : "rgba(34,197,94,0.14)",
                        color: selectedUser?.isDisabled ? "#F87171" : "#4ADE80"
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      )}

      <Dialog
        open={confirm} onClose={() => setConfirm(false)}
        PaperProps={{ sx: { bgcolor: "#101526", border: "1px solid #232B45", borderRadius: R.card, color: "#fff" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Send to {recipientCount} users?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#8B96AB" }}>
            This message goes to {AUDIENCES.find((a) => a.key === audience).label.toLowerCase()} as a push notification and
            an in-app notification. It cannot be recalled.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirm(false)} sx={{ ...btnSx, color: "#8B96AB" }}>Cancel</Button>
          <Button onClick={doSend} variant="contained" sx={{ ...btnSx, bgcolor: ACCENT, "&:hover": { bgcolor: "#4F46E5" } }}>Send</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity={toast.sev} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: R.field }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

export default Messages;
