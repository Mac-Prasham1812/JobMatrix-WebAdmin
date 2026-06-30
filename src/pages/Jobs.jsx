import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Fade
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import WorkIcon from "@mui/icons-material/Work";
import BoltIcon from "@mui/icons-material/Bolt";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PeopleIcon from "@mui/icons-material/People";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, deleteDoc, doc, query, where, getDoc } from "firebase/firestore";

import { db } from "../firebase/firebase";

function formatTime(value) {
  if (!value) return "";
  if (typeof value?.toMillis === "function") {
    return new Date(value.toMillis()).toLocaleDateString();
  }
  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000).toLocaleDateString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

function getTimeValue(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [applicantsOpen, setApplicantsOpen] = useState(false);
  const [applicantsJob, setApplicantsJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    const value = search.toLowerCase().trim();

    const filtered = jobs.filter((job) => {
      const title = (job.title || "").toLowerCase();
      const company = (job.company || "").toLowerCase();
      const location = (job.location || "").toLowerCase();
      const category = (job.category || "").toLowerCase();
      const status = (job.status || "").toLowerCase();
      const salary = String(job.salary || "").toLowerCase();

      return (
        title.includes(value) ||
        company.includes(value) ||
        location.includes(value) ||
        category.includes(value) ||
        status.includes(value) ||
        salary.includes(value)
      );
    });

    setFilteredJobs(filtered);
  }, [search, jobs]);

  const loadJobs = async () => {
    try {
      const snapshot = await getDocs(collection(db, "jobs"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      data.sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt));

      setJobs(data);
      setFilteredJobs(data);
    } catch (error) {
      console.log("Error loading jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (job) => {
    setDeleteTarget(job);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "jobs", deleteTarget.id));

      const updated = jobs.filter((j) => j.id !== deleteTarget.id);
      setJobs(updated);
      setFilteredJobs(
        updated.filter((job) => {
          const value = search.toLowerCase().trim();
          const title = (job.title || "").toLowerCase();
          const company = (job.company || "").toLowerCase();
          const location = (job.location || "").toLowerCase();
          const category = (job.category || "").toLowerCase();
          const status = (job.status || "").toLowerCase();
          const salary = String(job.salary || "").toLowerCase();
          return (
            title.includes(value) ||
            company.includes(value) ||
            location.includes(value) ||
            category.includes(value) ||
            status.includes(value) ||
            salary.includes(value)
          );
        })
      );

      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.log("Delete job error:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleViewApplicants = async (job) => {
    setApplicantsJob(job);
    setApplicantsOpen(true);
    setApplicantsLoading(true);

    try {
      const q = query(collection(db, "applications"), where("jobId", "==", job.id));
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      // Resolve student names from the users collection (one lookup per unique studentId).
      const uniqueIds = [...new Set(data.map((a) => a.studentId).filter(Boolean))];
      const nameMap = {};

      await Promise.all(
        uniqueIds.map(async (sid) => {
          try {
            const userSnap = await getDoc(doc(db, "users", sid));
            nameMap[sid] = userSnap.exists() ? userSnap.data().name || sid : sid;
          } catch {
            nameMap[sid] = sid;
          }
        })
      );

      const withNames = data.map((a) => ({
        ...a,
        studentName: a.studentId ? nameMap[a.studentId] || a.studentId : "Unknown student"
      }));

      setApplicants(withNames);
    } catch (error) {
      console.log("Error loading applicants:", error);
      setApplicants([]);
    } finally {
      setApplicantsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const active = jobs.filter(
      (job) => (job.status || "Active").toLowerCase() === "active"
    ).length;

    const closed = jobs.filter(
      (job) => (job.status || "").toLowerCase() === "closed"
    ).length;

    return { active, closed, total: jobs.length };
  }, [jobs]);

  const columns = [
    {
      field: "title",
      headerName: "Title",
      flex: 1.4,
      minWidth: 180,
      renderCell: (params) => (
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>
          {params.value || "-"}
        </Typography>
      )
    },
    {
      field: "company",
      headerName: "Company",
      flex: 1.2,
      minWidth: 160
    },
    {
      field: "location",
      headerName: "Location",
      flex: 1,
      minWidth: 140
    },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      minWidth: 140
    },
    {
      field: "salary",
      headerName: "Salary",
      flex: 0.9,
      minWidth: 120
    },
    {
      field: "experience",
      headerName: "Experience",
      flex: 0.9,
      minWidth: 130
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.9,
      minWidth: 120,
      renderCell: (params) => {
        const status = (params.value || "Active").toLowerCase();

        let chipColor = "#94A3B8";
        let chipBg = "rgba(148,163,184,0.12)";

        if (status === "active") {
          chipColor = "#22C55E";
          chipBg = "rgba(34,197,94,0.14)";
        } else if (status === "closed") {
          chipColor = "#EF4444";
          chipBg = "rgba(239,68,68,0.14)";
        } else if (status === "pending") {
          chipColor = "#F59E0B";
          chipBg = "rgba(245,158,11,0.14)";
        }

        return (
          <Chip
            label={params.value || "Active"}
            size="small"
            sx={{
              color: chipColor,
              bgcolor: chipBg,
              border: `1px solid ${chipColor}33`,
              fontWeight: 700,
              ...(status === "active" && {
                "&::before": {
                  content: '""',
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: "#22C55E",
                  mr: 0.7,
                  animation: "pulseDot 1.8s infinite"
                }
              })
            }}
          />
        );
      }
    },
    {
      field: "createdAt",
      headerName: "Created",
      flex: 1,
      minWidth: 140,
      valueGetter: (value, row) => formatTime(row.createdAt)
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 130,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="View applicants">
            <IconButton
              onClick={() => handleViewApplicants(params.row)}
              size="small"
              sx={{
                color: "primary.main",
                transition: "transform 0.15s ease, background-color 0.15s ease",
                "&:hover": {
                  bgcolor: "rgba(99,102,241,0.14)",
                  transform: "scale(1.12)"
                }
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete job">
            <IconButton
              onClick={() => handleDeleteClick(params.row)}
              size="small"
              sx={{
                color: "#EF4444",
                transition: "transform 0.15s ease, background-color 0.15s ease",
                "&:hover": {
                  bgcolor: "rgba(239,68,68,0.14)",
                  transform: "scale(1.12)"
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ width: "100%", maxWidth: "1600px" }}>
      <Card
        sx={{
          mb: 3,
          position: "relative",
          overflow: "hidden",
          borderRadius: 3.5,
          background: "linear-gradient(135deg, rgba(16,21,38,0.95), rgba(13,18,32,0.95))",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
          animation: "fadeUp 0.45s ease both"
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.2), transparent 70%)",
            animation: "driftC 9s ease-in-out infinite",
            pointerEvents: "none"
          }}
        />
        <CardContent sx={{ p: 3, position: "relative" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} color="text.primary">
                Jobs
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Manage all job posts from employers.
              </Typography>
            </Box>

            <WorkIcon sx={{ fontSize: 50, color: "success.main" }} />
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 2.5 }}>
            <Chip
              icon={<BoltIcon sx={{ fontSize: 16, color: "primary.light !important" }} />}
              label={`Total: ${stats.total}`}
              sx={{
                bgcolor: "rgba(99,102,241,0.12)",
                color: "primary.light",
                border: "1px solid rgba(99,102,241,0.2)",
                fontWeight: 700
              }}
            />
            <Chip
              label={`Active: ${stats.active}`}
              sx={{
                bgcolor: "rgba(34,197,94,0.12)",
                color: "success.main",
                border: "1px solid rgba(34,197,94,0.2)",
                fontWeight: 700
              }}
            />
            <Chip
              label={`Closed: ${stats.closed}`}
              sx={{
                bgcolor: "rgba(239,68,68,0.12)",
                color: "#FCA5A5",
                border: "1px solid rgba(239,68,68,0.2)",
                fontWeight: 700
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: 3.5,
          background: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
          animation: "fadeUp 0.5s ease both",
          animationDelay: "0.08s"
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <TextField
            fullWidth
            placeholder="Search job..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                color: "#fff",
                backgroundColor: "#0D1220",
                borderRadius: 2.5,
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                "& fieldset": { borderColor: "divider" },
                "&:hover fieldset": { borderColor: "#2A3447" },
                "&.Mui-focused fieldset": { borderColor: "success.main" },
                "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(34,197,94,0.18)" }
              },
              "& .MuiInputBase-input::placeholder": { color: "text.secondary", opacity: 1 }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.secondary" }} />
                </InputAdornment>
              )
            }}
          />

          {loading ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1.5} py={6} sx={{ animation: "fadeIn 0.3s ease" }}>
              <CircularProgress sx={{ color: "success.main" }} />
              <Typography color="text.secondary" fontSize={13}>
                Loading jobs...
              </Typography>
            </Box>
          ) : filteredJobs.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={8} sx={{ animation: "fadeIn 0.35s ease" }}>
              <WorkIcon sx={{ fontSize: 42, color: "text.secondary", opacity: 0.5 }} />
              <Typography color="text.secondary">No jobs found.</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                height: 650,
                width: "100%",
                animation: "fadeIn 0.4s ease",
                "& .MuiDataGrid-root": { border: 0 }
              }}
            >
              <DataGrid
                rows={filteredJobs}
                columns={columns}
                pageSizeOptions={[5, 10, 20, 50]}
                disableRowSelectionOnClick
                initialState={{
                  pagination: { paginationModel: { pageSize: 10, page: 0 } }
                }}
                sx={{
                  border: 0,
                  color: "#fff",
                  backgroundColor: "background.paper",
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#0D1220",
                    color: "text.primary",
                    borderBottom: "1px solid",
                    borderColor: "divider"
                  },
                  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700 },
                  "& .MuiDataGrid-cell": { borderColor: "divider" },
                  "& .MuiDataGrid-row": {
                    backgroundColor: "background.paper",
                    transition: "background-color 0.15s ease",
                    "&:hover": { backgroundColor: "#151B2E" }
                  },
                  "& .MuiDataGrid-footerContainer": {
                    borderTop: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "#0D1220",
                    color: "text.primary"
                  },
                  "& .MuiTablePagination-root": { color: "text.primary" },
                  "& .MuiCheckbox-root": { color: "text.secondary" },
                  "& .MuiDataGrid-filler": { backgroundColor: "background.paper" },
                  "& .MuiDataGrid-scrollbarFiller": { backgroundColor: "background.paper" }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        fullWidth
        maxWidth="xs"
        TransitionComponent={Fade}
        transitionDuration={220}
        PaperProps={{
          sx: {
            backgroundColor: "#0D1220",
            color: "#fff",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Job</DialogTitle>
        <DialogContent>
          <Divider sx={{ borderColor: "divider", mb: 2 }} />
          <Typography>
            Are you sure you want to delete <b>{deleteTarget?.title || "this job"}</b>
            {deleteTarget?.company ? ` at ${deleteTarget.company}` : ""}?
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            Existing applications for this job will not be removed. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            variant="outlined"
            disabled={deleting}
            sx={{ borderColor: "divider", color: "#fff" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            disabled={deleting}
            sx={{
              bgcolor: "#EF4444",
              transition: "background-color 0.15s ease",
              "&:hover": { bgcolor: "#DC2626" }
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={applicantsOpen}
        onClose={() => setApplicantsOpen(false)}
        fullWidth
        maxWidth="sm"
        TransitionComponent={Fade}
        transitionDuration={220}
        PaperProps={{
          sx: {
            backgroundColor: "#0D1220",
            color: "#fff",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Applicants
          {applicantsJob?.title ? ` — ${applicantsJob.title}` : ""}
        </DialogTitle>
        <DialogContent>
          <Divider sx={{ borderColor: "divider", mb: 2 }} />

          {applicantsLoading ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1.5} py={5}>
              <CircularProgress size={28} sx={{ color: "primary.main" }} />
              <Typography color="text.secondary" fontSize={13}>
                Loading applicants...
              </Typography>
            </Box>
          ) : applicants.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={6}>
              <PeopleIcon sx={{ fontSize: 38, color: "text.secondary", opacity: 0.5 }} />
              <Typography color="text.secondary">No applicants yet for this job.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {applicants.map((app) => {
                const status = (app.status || "Pending").toLowerCase();
                let chipColor = "#F59E0B";
                let chipBg = "rgba(245,158,11,0.14)";
                if (status === "shortlisted") {
                  chipColor = "#22C55E";
                  chipBg = "rgba(34,197,94,0.14)";
                } else if (status === "rejected") {
                  chipColor = "#EF4444";
                  chipBg = "rgba(239,68,68,0.14)";
                }

                return (
                  <Box
                    key={app.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: "#0D1220",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 1
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>
                        {app.studentName || "Unknown student"}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                        Applied: {formatTime(app.appliedAt) || "-"}
                      </Typography>
                    </Box>
                    <Chip
                      label={app.status || "Pending"}
                      size="small"
                      sx={{
                        color: chipColor,
                        bgcolor: chipBg,
                        border: `1px solid ${chipColor}33`,
                        fontWeight: 700
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setApplicantsOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Jobs;
