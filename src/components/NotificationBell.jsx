import { useEffect, useState } from "react";
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  Stack,
  Divider,
  Button,
  Chip
} from "@mui/material";

import NotificationsIcon from "@mui/icons-material/Notifications";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import FlagIcon from "@mui/icons-material/Flag";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const typeMeta = {
  NewEmployer: { icon: <BusinessIcon sx={{ fontSize: 18 }} />, color: "#A855F7" },
  NewJob: { icon: <WorkIcon sx={{ fontSize: 18 }} />, color: "#22C55E" },
  Report: { icon: <FlagIcon sx={{ fontSize: 18 }} />, color: "#EF4444" }
};

function formatTime(value) {
  const millis = typeof value === "number" ? value : value?.toMillis?.() ?? value?.seconds * 1000;
  if (!millis) return "";
  const diffMin = Math.round((Date.now() - millis) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(millis).toLocaleDateString();
}

function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [items, setItems] = useState([]);
  const [justArrived, setJustArrived] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "adminNotifications"), orderBy("createdAt", "desc"), limit(30));
    let first = true;

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (!first && data.length > items.length) {
        setJustArrived(true);
        setTimeout(() => setJustArrived(false), 1000);
      }
      first = false;
      setItems(data);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const openPanel = (e) => setAnchorEl(e.currentTarget);
  const closePanel = () => setAnchorEl(null);

  const handleItemClick = async (item) => {
    if (!item.isRead) {
      updateDoc(doc(db, "adminNotifications", item.id), { isRead: true }).catch(() => {});
    }
    closePanel();
    if (item.type === "NewEmployer") navigate("/employers");
    else if (item.type === "NewJob") navigate("/jobs");
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, "adminNotifications", n.id), { isRead: true }));
    try {
      await batch.commit();
    } catch (error) {
      console.log("Mark all read error:", error);
    }
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={openPanel}
        sx={{
          transition: "transform 0.2s ease",
          animation: justArrived ? "bellShake 0.5s ease" : "none",
          "&:hover": { transform: "scale(1.08)", backgroundColor: "#161D2E" },
          "@keyframes bellShake": {
            "0%, 100%": { transform: "rotate(0)" },
            "20%": { transform: "rotate(-14deg)" },
            "40%": { transform: "rotate(12deg)" },
            "60%": { transform: "rotate(-8deg)" },
            "80%": { transform: "rotate(6deg)" }
          }
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              transition: "transform 0.2s ease",
              transform: justArrived ? "scale(1.3)" : "scale(1)"
            }
          }}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={closePanel}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        TransitionProps={{ timeout: 220 }}
        PaperProps={{
          sx: {
            mt: 1,
            width: 360,
            maxHeight: 460,
            borderRadius: 3,
            background: "#101526",
            border: "1px solid #1C2333",
            color: "#fff",
            boxShadow: "0 20px 48px rgba(0,0,0,0.5)",
            overflow: "hidden"
          }
        }}
      >
        <Box sx={{ px: 2.25, py: 1.75, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography fontWeight={700} fontSize={15}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={markAllRead}
              sx={{ textTransform: "none", fontSize: 12.5, color: "#818CF8", fontWeight: 600 }}
            >
              Mark all read
            </Button>
          )}
        </Box>
        <Divider sx={{ borderColor: "#1C2333" }} />

        <Box sx={{ maxHeight: 380, overflowY: "auto" }}>
          {items.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={5}>
              <InboxOutlinedIcon sx={{ fontSize: 32, color: "#5B6678" }} />
              <Typography color="#8B96AB" fontSize={13}>
                No notifications yet.
              </Typography>
            </Box>
          ) : (
            items.map((item, i) => {
              const meta = typeMeta[item.type] || { icon: <NotificationsIcon sx={{ fontSize: 18 }} />, color: "#818CF8" };
              return (
                <Box
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  sx={{
                    px: 2.25,
                    py: 1.5,
                    display: "flex",
                    gap: 1.5,
                    alignItems: "flex-start",
                    cursor: "pointer",
                    borderLeft: item.isRead ? "3px solid transparent" : `3px solid ${meta.color}`,
                    backgroundColor: item.isRead ? "transparent" : "rgba(99,102,241,0.06)",
                    transition: "background-color 0.15s ease",
                    animation: "fadeUp 0.3s ease both",
                    animationDelay: `${i * 0.03}s`,
                    "&:hover": { backgroundColor: "#161D2E" }
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 2,
                      bgcolor: `${meta.color}1A`,
                      color: meta.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    {meta.icon}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontSize={13.5} fontWeight={600} sx={{ color: "#F1F5F9" }}>
                      {item.title || "Notification"}
                    </Typography>
                    <Typography fontSize={12.5} sx={{ color: "#8B96AB", mt: 0.25 }}>
                      {item.message}
                    </Typography>
                    <Typography fontSize={11} sx={{ color: "#5B6678", mt: 0.4 }}>
                      {formatTime(item.createdAt)}
                    </Typography>
                  </Box>
                  {!item.isRead && (
                    <Chip
                      label="New"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor: `${meta.color}22`,
                        color: meta.color,
                        border: `1px solid ${meta.color}44`
                      }}
                    />
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Popover>
    </>
  );
}

export default NotificationBell;
