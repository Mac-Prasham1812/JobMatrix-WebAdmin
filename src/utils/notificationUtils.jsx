import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import FlagIcon from "@mui/icons-material/Flag";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { collection, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const COL = "adminNotifications";

// Add new notification types here; unknown types fall back to a generic look.
const typeMeta = {
  NewEmployer: { label: "New Employer", Icon: BusinessIcon, color: "#A855F7", route: "/employers" },
  NewJob: { label: "New Job", Icon: WorkIcon, color: "#22C55E", route: "/jobs" },
  Report: { label: "Report", Icon: FlagIcon, color: "#EF4444", route: null }
};

export function getMeta(type) {
  return typeMeta[type] || { label: type || "General", Icon: NotificationsIcon, color: "#818CF8", route: null };
}

export function toMillis(v) {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (v.toMillis) return v.toMillis();
  if (v.seconds) return v.seconds * 1000;
  return 0;
}

export function fullDate(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function timeAgo(ms) {
  if (!ms) return "just now";
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return fullDate(ms);
}

// Runs a batched write over ids in chunks (Firestore batch limit is 500).
export async function runBatch(ids, fn) {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => fn(batch, doc(db, COL, id)));
    await batch.commit();
  }
}

export async function markAllRead() {
  const snap = await getDocs(query(collection(db, COL), where("isRead", "==", false)));
  await runBatch(
    snap.docs.map((d) => d.id),
    (batch, ref) => batch.update(ref, { isRead: true })
  );
}
