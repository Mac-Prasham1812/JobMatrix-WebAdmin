import { useEffect, useState } from "react";
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  Divider,
  Button,
  Chip
} from "@mui/material";

import NotificationsIcon from "@mui/icons-material/Notifications";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import useUnreadCount from "../hooks/useUnreadCount";
import { COL, getMeta, toMillis, timeAgo, markAllRead } from "../utils/notificationUtils";

function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [items, setItems] = useState([]);
  const [justArrived, setJustArrived] = useState(false);
  const navigate = useNavigate();

  const unreadCount = useUnreadCount(() => {
    setJustArrived(true);
    setTimeout(() => setJustArrived(false), 1000);
  });

  // Latest 5 for the dropdown
  useEffect(() => {
    const q = query(collection(db, COL), orderBy("createdAt", "desc"), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const closePanel = () => setAnchorEl(null);

  const handleItemClick = (item) => {
    if (!item.isRead) {
      updateDoc(doc(db, COL, item.id), { isRead: true }).catch(() => {});
    }
    closePanel();
    const route = getMeta(item.type).route;
    if (route) navigate(route);
  };

  const handleViewAll = () => {
    closePanel();
    navigate("/notifications");
  };

  const handleMarkAll = () => {
    markAllRead().catch((e) => console.log("Mark all read error:", e));
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
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
          max={9}
          color="error"
          overlap="circular"
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          sx={{
            "& .MuiBadge-badge": {
              minWidth: 17,
              height: 17,
              padding: "0 4px",
              fontSize: 10,
              fontWeight: 700,
              top: 1,
              right: 1,
              border: "2px solid #0B1220",
              animation: justArrived ? "badgePulse 1s ease" : "none"
            },
            "@keyframes badgePulse": {
              "0%": { boxShadow: "0 0 0 0 rgba(239,68,68,0.7)" },
              "100%": { boxShadow: "0 0 0 10px rgba(239,68,68,0)" }
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
            width: 380,
            maxWidth: "calc(100vw - 24px)",
            borderRadius: 3,
            background: "#101526",
            border: "1px solid #1C2333",
            color: "#fff",
            boxShadow: "0 20px 48px rgba(0,0,0,0.5)",
            overflow: "hidden",
            "@keyframes fadeUp": {
              from: { opacity: 0, transform: "translateY(8px)" },
              to: { opacity: 1, transform: "none" }
            }
          }
        }}
      >
        <Box sx={{ px: 2.25, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography fontWeight={700} fontSize={15}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} new`}
                size="small"
                sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: "rgba(239,68,68,0.15)", color: "#F87171" }}
              />
            )}
          </Box>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={handleMarkAll}
              sx={{ textTransform: "none", fontSize: 12.5, color: "#818CF8", fontWeight: 600 }}
            >
              Mark all read
            </Button>
          )}
        </Box>
        <Divider sx={{ borderColor: "#1C2333" }} />

        <Box>
          {items.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={5}>
              <InboxOutlinedIcon sx={{ fontSize: 32, color: "#5B6678" }} />
              <Typography color="#8B96AB" fontSize={13}>
                No notifications yet.
              </Typography>
            </Box>
          ) : (
            items.map((item, i) => {
              const meta = getMeta(item.type);
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
                    <meta.Icon sx={{ fontSize: 18 }} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontSize={13.5} fontWeight={600} sx={{ color: "#F1F5F9" }}>
                      {item.title || "Notification"}
                    </Typography>
                    <Typography fontSize={12.5} sx={{ color: "#8B96AB", mt: 0.25 }}>
                      {item.message}
                    </Typography>
                    <Typography fontSize={11} sx={{ color: "#5B6678", mt: 0.4 }}>
                      {timeAgo(toMillis(item.createdAt))}
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

        <Divider sx={{ borderColor: "#1C2333" }} />
        <Button
          fullWidth
          onClick={handleViewAll}
          endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
          sx={{
            py: 1.25,
            borderRadius: 0,
            textTransform: "none",
            fontWeight: 600,
            fontSize: 13,
            color: "#818CF8",
            "&:hover": { backgroundColor: "#161D2E" }
          }}
        >
          View all notifications
        </Button>
      </Popover>
    </>
  );
}

export default NotificationBell;
