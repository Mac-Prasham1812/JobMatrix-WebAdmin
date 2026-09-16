import { Avatar } from "@mui/material";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

// tone: "primary" | "secondary" | "warning"
const TONES = {
  primary: { bg: "rgba(99,102,241,0.16)", color: "primary.light", border: "rgba(99,102,241,0.3)" },
  secondary: { bg: "rgba(168,85,247,0.16)", color: "secondary.main", border: "rgba(168,85,247,0.3)" },
  warning: { bg: "rgba(245,158,11,0.16)", color: "warning.main", border: "rgba(245,158,11,0.3)" }
};

function UserAvatar({ name, photoUrl, size = 30, tone = "primary" }) {
  const t = TONES[tone] || TONES.primary;
  return (
    <Avatar
      src={photoUrl || undefined}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        fontWeight: 700,
        bgcolor: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`
      }}
    >
      {initials(name)}
    </Avatar>
  );
}

export default UserAvatar;
