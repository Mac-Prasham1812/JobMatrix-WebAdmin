import { useEffect, useState } from "react";
import { Grid, Card, CardContent, Typography, Box, Stack, Divider, Chip, Skeleton } from "@mui/material";

import SchoolIcon from "@mui/icons-material/School";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/firebase";

const cardMeta = [
  { key: "students", title: "Students", color: "#6366F1", icon: <SchoolIcon sx={{ fontSize: 28 }} /> },
  { key: "employers", title: "Employers", color: "#A855F7", icon: <BusinessIcon sx={{ fontSize: 28 }} /> },
  { key: "jobs", title: "Jobs", color: "#22C55E", icon: <WorkIcon sx={{ fontSize: 28 }} /> },
  { key: "applications", title: "Applications", color: "#F59E0B", icon: <AssignmentIcon sx={{ fontSize: 28 }} /> }
];

function Dashboard() {
  const [counts, setCounts] = useState({ students: 0, employers: 0, jobs: 0, applications: 0 });
  const [jobStats, setJobStats] = useState({ active: 0 });
  const [appStats, setAppStats] = useState({ pending: 0, shortlisted: 0, rejected: 0 });
  const [recentApplications, setRecentApplications] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const usersCol = collection(db, "users");
      const [studentSnap, employerSnap, jobsSnap, applicationsSnap] = await Promise.all([
        getDocs(query(usersCol, where("role", "==", "Student"))),
        getDocs(query(usersCol, where("role", "==", "Employer"))),
        getDocs(collection(db, "jobs")),
        getDocs(collection(db, "applications"))
      ]);

      setCounts({
        students: studentSnap.size,
        employers: employerSnap.size,
        jobs: jobsSnap.size,
        applications: applicationsSnap.size
      });

      const activeJobs = jobsSnap.docs.filter((d) => d.data().status === "Active").length;
      setJobStats({ active: activeJobs });

      const appDocs = applicationsSnap.docs.map((d) => d.data());
      setAppStats({
        pending: appDocs.filter((a) => a.status === "Pending").length,
        shortlisted: appDocs.filter((a) => a.status === "Shortlisted").length,
        rejected: appDocs.filter((a) => a.status === "Rejected").length
      });

      try {
        const recentAppsSnap = await getDocs(
          query(collection(db, "applications"), orderBy("appliedAt", "desc"), limit(4))
        );
        setRecentApplications(recentAppsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        setRecentApplications([]);
      }

      try {
        const recentJobsSnap = await getDocs(
          query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(4))
        );
        setRecentJobs(recentJobsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        setRecentJobs([]);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const cards = cardMeta.map((c) => ({ ...c, value: counts[c.key] }));

  const emptyRow = (icon, title, desc) => (
    <Box sx={{ border: "1px solid #1C2333", borderRadius: 3, p: 2.5, bgcolor: "#0D1220" }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 42, height: 42, borderRadius: 2.5, bgcolor: "#101526",
            border: "1px solid #1C2333", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#5B6678", flexShrink: 0
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: "#E2E8F0", fontWeight: 600, fontSize: 15 }}>{title}</Typography>
          <Typography sx={{ color: "#8B96AB", mt: 0.4, lineHeight: 1.6, fontSize: 13.5 }}>{desc}</Typography>
        </Box>
      </Stack>
    </Box>
  );

  const skeletonRow = (i) => (
    <Box
      key={`sk-${i}`}
      sx={{ border: "1px solid #1C2333", borderRadius: 3, p: 2.25, bgcolor: "#0D1220" }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Skeleton variant="rounded" width={42} height={42} sx={{ borderRadius: "10px", bgcolor: "rgba(148,163,184,0.08)" }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Skeleton variant="text" width="55%" height={20} sx={{ bgcolor: "rgba(148,163,184,0.08)" }} />
          <Skeleton variant="text" width="35%" height={16} sx={{ bgcolor: "rgba(148,163,184,0.06)" }} />
        </Box>
      </Stack>
    </Box>
  );

  const renderListSection = (title, chipColor, chipText, items, emptyTitle, emptyDesc, renderItem, isLoading) => (
    <Card
      sx={{
        minHeight: 320,
        borderRadius: 3.5,
        background: "#101526",
        border: "1px solid #1C2333",
        boxShadow: "0 10px 28px rgba(0,0,0,0.18)"
      }}
    >
      <CardContent sx={{ p: 3.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h6" fontWeight="700" sx={{ color: "#F8FAFC", fontSize: 17 }}>
            {title}
          </Typography>
          <Chip
            size="small"
            label={chipText}
            sx={{
              bgcolor: `${chipColor}1A`,
              color: chipColor,
              border: `1px solid ${chipColor}29`,
              fontWeight: 600,
              height: 24
            }}
          />
        </Stack>

        <Divider sx={{ my: 2.25, borderColor: "#1C2333" }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {isLoading
            ? [0, 1].map(skeletonRow)
            : items.length === 0
            ? emptyRow(<InboxOutlinedIcon sx={{ fontSize: 22 }} />, emptyTitle, emptyDesc)
            : items.map((item, i) => (
                <Box
                  key={item.id}
                  sx={{
                    border: "1px solid #1C2333",
                    borderRadius: 3,
                    p: 2.25,
                    bgcolor: "#0D1220",
                    animation: "fadeUp 0.35s ease",
                    animationDelay: `${i * 0.05}s`,
                    animationFillMode: "backwards",
                    transition: "border-color 0.2s ease, transform 0.2s ease",
                    "&:hover": { borderColor: "rgba(148,163,184,0.3)", transform: "translateX(2px)" }
                  }}
                >
                  {renderItem(item)}
                </Box>
              ))}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ width: "100%", maxWidth: "1600px" }}>
      <Card
        sx={{
          mb: 4,
          borderRadius: 3.5,
          background: "linear-gradient(135deg, rgba(16,21,38,0.9) 0%, rgba(13,18,32,0.9) 100%)",
          border: "1px solid #1C2333",
          boxShadow: "0 14px 32px rgba(0,0,0,0.2)",
          backdropFilter: "blur(16px)",
          animation: "fadeUp 0.4s ease",
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            top: -60, right: -60,
            width: 220, height: 220,
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
            sx={{ width: "100%" }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: "#818CF8", letterSpacing: "0.14em", fontWeight: 600 }}>
                JobMatrix Admin Panel
              </Typography>
              <Typography variant="h4" fontWeight="700" sx={{ color: "#F8FAFC", mt: 0.5 }}>
                Dashboard Overview
              </Typography>
              <Typography sx={{ color: "#8B96AB", mt: 1, maxWidth: 760, lineHeight: 1.7, fontSize: 14.5 }}>
                Manage students, employers, jobs, and applications from one centralized control panel.
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: { xs: "flex-start", md: "flex-end" },
                gap: 0.75,
                ml: { md: "auto" },
                flexShrink: 0
              }}
            >
              <Chip
                icon={
                  <Box
                    sx={{
                      width: 8, height: 8, borderRadius: "50%",
                      bgcolor: loading ? "#F59E0B" : "#22C55E",
                      ml: 1.25,
                      boxShadow: loading ? "none" : "0 0 0 0 rgba(34,197,94,0.6)",
                      animation: loading ? "none" : "pulseDot 1.8s ease-in-out infinite"
                    }}
                  />
                }
                label={loading ? "Syncing..." : "Live Firebase Data"}
                sx={{
                  bgcolor: "rgba(99,102,241,0.12)",
                  color: "#A5B4FC",
                  border: "1px solid rgba(99,102,241,0.22)",
                  fontWeight: 600,
                  px: 1,
                  "& .MuiChip-icon": { order: -1 }
                }}
              />
              <Typography sx={{ color: "#5B6678", fontSize: 12 }}>
                Updated just now
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {cards.map((card, index) => (
          <Grid key={card.key} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                borderRadius: 3.5,
                background: "linear-gradient(160deg, rgba(16,21,38,0.95), rgba(13,18,32,0.95))",
                backdropFilter: "blur(10px)",
                border: "1px solid #1C2333",
                boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
                transition: "transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
                position: "relative",
                overflow: "hidden",
                animation: "fadeUp 0.4s ease",
                animationDelay: `${index * 0.07}s`,
                animationFillMode: "backwards",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0, left: 0, right: 0,
                  height: 3,
                  background: `linear-gradient(90deg, ${card.color}, transparent)`
                },
                "&:hover": {
                  transform: "translateY(-4px)",
                  borderColor: `${card.color}55`,
                  boxShadow: `0 18px 36px rgba(0,0,0,0.28), 0 0 24px ${card.color}1F`
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: "#8B96AB", fontSize: 13.5, fontWeight: 500, mb: 1 }}>
                      {card.title}
                    </Typography>
                    {loading ? (
                      <Skeleton
                        variant="text"
                        width={56}
                        height={42}
                        sx={{ bgcolor: "rgba(148,163,184,0.08)", transform: "none" }}
                      />
                    ) : (
                      <Typography variant="h3" fontWeight="700" sx={{ color: "#F8FAFC", letterSpacing: "-0.04em", lineHeight: 1, fontSize: 34 }}>
                        {card.value}
                      </Typography>
                    )}
                  </Box>

                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2.75,
                      bgcolor: `${card.color}18`,
                      border: `1px solid ${card.color}35`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: card.color,
                      flexShrink: 0,
                      alignSelf: "flex-start",
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                      ".MuiCard-root:hover &": {
                        transform: "scale(1.08)",
                        boxShadow: `0 0 0 6px ${card.color}14`
                      }
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>

                <Box sx={{ mt: 2.25, minHeight: 20 }}>
                  {loading ? (
                    <Skeleton variant="text" width={90} height={18} sx={{ bgcolor: "rgba(148,163,184,0.06)" }} />
                  ) : card.key === "jobs" ? (
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#22C55E" }} />
                      <Typography variant="body2" sx={{ color: "#8B96AB", fontWeight: 500, fontSize: 12.5 }}>
                        {jobStats.active} active
                      </Typography>
                    </Stack>
                  ) : card.key === "applications" ? (
                    <Typography variant="body2" sx={{ color: "#8B96AB", fontWeight: 500, fontSize: 12, lineHeight: 1.5 }}>
                      {appStats.shortlisted} shortlisted &middot; {appStats.pending} pending &middot; {appStats.rejected} rejected
                    </Typography>
                  ) : (
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <TrendingUpIcon sx={{ color: "#22C55E", fontSize: 16 }} />
                      <Typography variant="body2" sx={{ color: "#22C55E", fontWeight: 500, fontSize: 12.5 }}>
                        Registered total
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3.5 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          {renderListSection(
            "Recent Applications",
            "#F59E0B",
            "Latest",
            recentApplications,
            "No recent applications",
            "New applications will appear here once students start applying for jobs.",
            (item) => (
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 42, height: 42, borderRadius: 2.5, bgcolor: "#101526",
                    border: "1px solid #1C2333", display: "flex", alignItems: "center",
                    justifyContent: "center", color: "#F59E0B", flexShrink: 0
                  }}
                >
                  <AssignmentIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: "#E2E8F0", fontWeight: 600, fontSize: 15 }}>
                    {item.jobTitle || "Application"}
                  </Typography>
                  <Typography sx={{ color: "#8B96AB", mt: 0.4, fontSize: 13.5 }}>
                    {item.companyName ? `${item.companyName} \u2022 ${item.status || "Pending"}` : "Status: " + (item.status || "Pending")}
                  </Typography>
                </Box>
              </Stack>
            ),
            loading
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          {renderListSection(
            "Recent Jobs",
            "#22C55E",
            "Latest",
            recentJobs,
            "No recent jobs",
            "Newly posted jobs will appear here from the employer panel.",
            (item) => (
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 42, height: 42, borderRadius: 2.5, bgcolor: "#101526",
                    border: "1px solid #1C2333", display: "flex", alignItems: "center",
                    justifyContent: "center", color: "#22C55E", flexShrink: 0
                  }}
                >
                  <WorkIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: "#E2E8F0", fontWeight: 600, fontSize: 15 }}>
                    {item.title || "Job posting"}
                  </Typography>
                  <Typography sx={{ color: "#8B96AB", mt: 0.4, fontSize: 13.5 }}>
                    {item.company || "Employer"}
                  </Typography>
                </Box>
              </Stack>
            ),
            loading
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
