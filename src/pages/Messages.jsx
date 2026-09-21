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
  CircularProgress
} from "@mui/material";

import SendIcon from "@mui/icons-material/Send";
import PeopleIcon from "@mui/icons-material/People";
import SchoolIcon from "@mui/icons-material/School";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { toMillis, timeAgo, fullDate } from "../utils/notificationUtils";

// Backend base URL: use the same env variable your Applications.jsx uses for /send-notification.
const API_BASE = "https://jobmatrix-backend-cd5v.onrender.com";

const TITLE_MAX = 80;
const MSG_MAX = 500;
const DAY = 86400000;
const ACCENT = "#6366F1";
const R = { card: "14px", field: "10px", chip: "8px", tile: "10px" };

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

  // Recipients pool (enabled students and employers)
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

  // Live sent history
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
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

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
            <SendIcon sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#F1F5F9", lineHeight: 1.15 }}>Messages</Typography>
            <Typography sx={{ fontSize: 13.5, color: "#8B96AB", mt: 0.5 }}>
              Send announcements or direct messages to students and employers.
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
          <Typography sx={{ fontSize: 13, color: "#F1F5F9", fontWeight: 600 }}>Messages</Typography>
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
              <Typography sx={{ fontSize: 12, color: "#8B96AB" }}>{s.helper}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Composer + preview */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 360px" }, gap: 2, alignItems: "start", mb: 2.5 }}>
        {/* Composer */}
        <Box sx={{ ...panel, p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#F1F5F9", mb: 1.5 }}>Compose message</Typography>

          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#8B96AB", mb: 1 }}>Audience</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {AUDIENCES.map((a) => {
              const active = audience === a.key;
              return (
                <Box
                  key={a.key}
                  onClick={() => {
                    setAudience(a.key);
                    if (a.key !== "user") setTarget(null);
                  }}
                  sx={{
                    px: 1.75,
                    py: 0.9,
                    borderRadius: R.field,
                    cursor: "pointer",
                    userSelect: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.9,
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: active ? "#F1F5F9" : "#8B96AB",
                    bgcolor: active ? "rgba(99,102,241,0.16)" : "#0B1220",
                    border: `1px solid ${active ? ACCENT : "#232B45"}`,
                    boxShadow: active ? `0 0 14px ${ACCENT}55` : "none",
                    transition: "all .15s ease",
                    "&:hover": { color: "#F1F5F9" }
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
            fullWidth
            size="small"
            placeholder="e.g. Scheduled maintenance tonight"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            sx={{ ...fieldSx, mb: 0.5 }}
          />
          <Typography sx={{ fontSize: 11.5, color: "#5B6678", textAlign: "right", mb: 1.75 }}>
            {title.length}/{TITLE_MAX}
          </Typography>

          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#8B96AB", mb: 1 }}>Message</Typography>
          <TextField
            fullWidth
            multiline
            minRows={5}
            maxRows={10}
            placeholder="Write your message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MSG_MAX))}
            sx={{ ...fieldSx, mb: 0.5 }}
          />
          <Typography sx={{ fontSize: 11.5, color: "#5B6678", textAlign: "right", mb: 2 }}>
            {message.length}/{MSG_MAX}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
            <Typography sx={{ fontSize: 13, color: "#A5B0C5" }}>{recipientSummary()}</Typography>
            <Button
              variant="contained"
              disabled={!canSend}
              onClick={handleSend}
              startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              sx={{
                ...btnSx,
                px: 3,
                py: 1,
                bgcolor: ACCENT,
                boxShadow: canSend ? `0 0 18px ${ACCENT}66` : "none",
                "&:hover": { bgcolor: "#4F46E5" }
              }}
            >
              {sending ? "Sending..." : "Send message"}
            </Button>
          </Box>
        </Box>

        {/* Preview */}
        <Box sx={{ ...panel, p: 2.25, position: { lg: "sticky" }, top: { lg: 90 } }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#F1F5F9" }}>Live preview</Typography>
          <Typography sx={{ fontSize: 12, color: "#5B6678", mb: 1.5 }}>How it appears on the user's phone</Typography>

          <Box
            sx={{
              p: 1.75,
              display: "flex",
              gap: 1.5,
              borderRadius: R.card,
              bgcolor: "#0B1220",
              border: "1px solid #232B45"
            }}
          >
            <Avatar sx={{ width: 38, height: 38, fontWeight: 700, background: "linear-gradient(135deg, #6366F1, #A855F7)" }}>
              J
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12, color: "#8B96AB" }}>JobMatrix Support</Typography>
                <Typography sx={{ fontSize: 12, color: "#5B6678" }}>now</Typography>
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: title ? "#F1F5F9" : "#475569", wordBreak: "break-word" }}>
                {title || "Message title"}
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  color: message ? "#A5B0C5" : "#475569",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}
              >
                {message || "Your message will appear here."}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.75 }}>
            <Chip
              label={audience === "user" ? "Direct message" : "Announcement"}
              size="small"
              sx={{ height: 24, borderRadius: R.chip, bgcolor: "rgba(99,102,241,0.16)", color: "#C7D2FE", fontWeight: 600 }}
            />
            <Chip
              label={recipientSummary()}
              size="small"
              sx={{ height: 24, borderRadius: R.chip, bgcolor: "#0B1220", color: "#A5B0C5", border: "1px solid #232B45" }}
            />
          </Box>
        </Box>
      </Box>

      {/* History */}
      <Box sx={{ ...panel, overflow: "hidden" }}>
        <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid #232B45" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#F1F5F9" }}>Recent messages</Typography>
        </Box>

        {loadingHistory ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress size={24} />
          </Box>
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
                  px: 2.5,
                  py: 1.75,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.75,
                  borderTop: i ? "1px solid #161D2E" : "none",
                  animation: "fadeUp .3s ease both",
                  animationDelay: `${Math.min(i, 10) * 0.03}s`,
                  "&:hover": { bgcolor: "#161D2E" }
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#818CF8",
                    bgcolor: "rgba(99,102,241,0.14)",
                    border: `1px solid ${ACCENT}44`
                  }}
                >
                  <SendIcon sx={{ fontSize: 19 }} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: "#F1F5F9" }}>{m.title}</Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: "#A5B0C5",
                      mt: 0.25,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      wordBreak: "break-word"
                    }}
                  >
                    {m.message}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mt: 0.9 }}>
                    <Chip
                      label={audienceLabel(m)}
                      size="small"
                      sx={{ height: 22, borderRadius: "6px", fontSize: 11.5, fontWeight: 600, bgcolor: "rgba(99,102,241,0.16)", color: "#C7D2FE" }}
                    />
                    <Chip
                      label={`${m.recipientCount || 0} recipient${m.recipientCount === 1 ? "" : "s"}`}
                      size="small"
                      sx={{ height: 22, borderRadius: "6px", fontSize: 11.5, bgcolor: "#0B1220", color: "#A5B0C5", border: "1px solid #232B45" }}
                    />
                    {typeof m.pushSuccess === "number" && (
                      <Chip
                        label={`Push ${m.pushSuccess}/${m.pushTokens || 0}`}
                        size="small"
                        sx={{ height: 22, borderRadius: "6px", fontSize: 11.5, bgcolor: "rgba(34,197,94,0.12)", color: "#22C55E" }}
                      />
                    )}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#7C87A0" }}>
                      <AccessTimeIcon sx={{ fontSize: 13 }} />
                      <Typography sx={{ fontSize: 12, color: "inherit" }}>
                        {timeAgo(ms)}
                        {ms ? `  |  ${fullDate(ms)}` : ""}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Confirm group send */}
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
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
          <Button onClick={() => setConfirm(false)} sx={{ ...btnSx, color: "#8B96AB" }}>
            Cancel
          </Button>
          <Button onClick={doSend} variant="contained" sx={{ ...btnSx, bgcolor: ACCENT, "&:hover": { bgcolor: "#4F46E5" } }}>
            Send
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
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

export default Messages;
