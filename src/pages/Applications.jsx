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
  Button
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AssignmentIcon from "@mui/icons-material/Assignment";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs } from "firebase/firestore";

import { db } from "../firebase/firebase";

function formatTime(value) {
  if (!value) return "";
  if (typeof value?.toMillis === "function") {
    return new Date(value.toMillis()).toLocaleString();
  }
  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000).toLocaleString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function getTimeValue(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function Applications() {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    const value = search.toLowerCase().trim();

    const filtered = applications.filter((application) => {
      const jobTitle = (application.jobTitle || "").toLowerCase();
      const companyName = (application.companyName || "").toLowerCase();
      const studentId = (application.studentId || "").toLowerCase();
      const status = (application.status || "").toLowerCase();
      const applicationId = (application.applicationId || "").toLowerCase();

      return (
        jobTitle.includes(value) ||
        companyName.includes(value) ||
        studentId.includes(value) ||
        status.includes(value) ||
        applicationId.includes(value)
      );
    });

    setFilteredApplications(filtered);
  }, [search, applications]);

  const loadApplications = async () => {
    try {
      const snapshot = await getDocs(collection(db, "applications"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      data.sort(
        (a, b) => getTimeValue(b.appliedAt) - getTimeValue(a.appliedAt)
      );

      setApplications(data);
      setFilteredApplications(data);
    } catch (error) {
      console.log("Error loading applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const pending = applications.filter(
      (app) => (app.status || "Pending").toLowerCase() === "pending"
    ).length;

    const shortlisted = applications.filter(
      (app) => (app.status || "").toLowerCase() === "shortlisted"
    ).length;

    const rejected = applications.filter(
      (app) => (app.status || "").toLowerCase() === "rejected"
    ).length;

    return {
      pending,
      shortlisted,
      rejected,
      total: applications.length
    };
  }, [applications]);

  const columns = [
    {
      field: "jobTitle",
      headerName: "Job Title",
      flex: 1.3,
      minWidth: 180
    },
    {
      field: "companyName",
      headerName: "Company",
      flex: 1.2,
      minWidth: 160
    },
    {
      field: "studentId",
      headerName: "Student ID",
      flex: 1.3,
      minWidth: 180
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.9,
      minWidth: 130,
      renderCell: (params) => {
        const status = (params.value || "Pending").toLowerCase();

        let chipColor = "#94A3B8";
        let chipBg = "rgba(148,163,184,0.12)";

        if (status === "pending") {
          chipColor = "#F59E0B";
          chipBg = "rgba(245,158,11,0.14)";
        } else if (status === "shortlisted") {
          chipColor = "#22C55E";
          chipBg = "rgba(34,197,94,0.14)";
        } else if (status === "rejected") {
          chipColor = "#EF4444";
          chipBg = "rgba(239,68,68,0.14)";
        }

        return (
          <Chip
            label={params.value || "Pending"}
            size="small"
            sx={{
              color: chipColor,
              bgcolor: chipBg,
              border: `1px solid ${chipColor}33`,
              fontWeight: 700
            }}
          />
        );
      }
    },
    {
      field: "resumeLink",
      headerName: "Resume",
      flex: 1,
      minWidth: 150,
      renderCell: (params) =>
        params.value ? (
          <Button
            variant="contained"
            size="small"
            href={params.value}
            target="_blank"
            rel="noreferrer"
            sx={{
              textTransform: "none",
              borderRadius: 2,
              fontWeight: 700,
              bgcolor: "#6366F1",
              "&:hover": {
                bgcolor: "#4F46E5"
              }
            }}
          >
            Open Resume
          </Button>
        ) : (
          <Typography sx={{ color: "#8B96AB", fontSize: 13 }}>
            No Resume
          </Typography>
        )
    },
    {
      field: "appliedAt",
      headerName: "Applied At",
      flex: 1.2,
      minWidth: 180,
      valueGetter: (value, row) => formatTime(row.appliedAt)
    }
  ];

  return (
    <Box sx={{ width: "100%", maxWidth: "1600px" }}>
      <Card
        sx={{
          mb: 3,
          borderRadius: 3.5,
          background:
            "linear-gradient(135deg, rgba(16,21,38,0.95), rgba(13,18,32,0.95))",
          border: "1px solid #1C2333",
          boxShadow: "0 10px 24px rgba(0,0,0,0.16)"
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
          >
            <Box>
              <Typography variant="h4" fontWeight={700} color="#F8FAFC">
                Applications
              </Typography>
              <Typography color="#8B96AB" sx={{ mt: 1 }}>
                Manage all job applications from students.
              </Typography>
            </Box>

            <AssignmentIcon
              sx={{
                fontSize: 50,
                color: "#F59E0B"
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1.5,
              mt: 2.5
            }}
          >
            <Chip
              label={`Total: ${stats.total}`}
              sx={{
                bgcolor: "rgba(99,102,241,0.12)",
                color: "#A5B4FC",
                border: "1px solid rgba(99,102,241,0.2)",
                fontWeight: 700
              }}
            />
            <Chip
              label={`Pending: ${stats.pending}`}
              sx={{
                bgcolor: "rgba(245,158,11,0.12)",
                color: "#FCD34D",
                border: "1px solid rgba(245,158,11,0.2)",
                fontWeight: 700
              }}
            />
            <Chip
              label={`Shortlisted: ${stats.shortlisted}`}
              sx={{
                bgcolor: "rgba(34,197,94,0.12)",
                color: "#86EFAC",
                border: "1px solid rgba(34,197,94,0.2)",
                fontWeight: 700
              }}
            />
            <Chip
              label={`Rejected: ${stats.rejected}`}
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
          background: "#101526",
          border: "1px solid #1C2333",
          boxShadow: "0 10px 24px rgba(0,0,0,0.16)"
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <TextField
            fullWidth
            placeholder="Search application..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                color: "#fff",
                backgroundColor: "#0D1220",
                borderRadius: 2.5,
                "& fieldset": {
                  borderColor: "#1C2333"
                },
                "&:hover fieldset": {
                  borderColor: "#2A3447"
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#6366F1"
                }
              },
              "& .MuiInputBase-input::placeholder": {
                color: "#8B96AB",
                opacity: 1
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#8B96AB" }} />
                </InputAdornment>
              )
            }}
          />

          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                height: 650,
                width: "100%",
                "& .MuiDataGrid-root": {
                  border: 0
                }
              }}
            >
              <DataGrid
                rows={filteredApplications}
                columns={columns}
                pageSizeOptions={[5, 10, 20, 50]}
                disableRowSelectionOnClick
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 10,
                      page: 0
                    }
                  }
                }}
                sx={{
                  border: 0,
                  color: "#fff",
                  backgroundColor: "#101526",

                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#0D1220",
                    color: "#F8FAFC",
                    borderBottom: "1px solid #1C2333"
                  },

                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontWeight: 700
                  },

                  "& .MuiDataGrid-cell": {
                    borderColor: "#1C2333"
                  },

                  "& .MuiDataGrid-row": {
                    backgroundColor: "#101526",
                    "&:hover": {
                      backgroundColor: "#0D1220"
                    }
                  },

                  "& .MuiDataGrid-footerContainer": {
                    borderTop: "1px solid #1C2333",
                    backgroundColor: "#0D1220",
                    color: "#F8FAFC"
                  },

                  "& .MuiTablePagination-root": {
                    color: "#F8FAFC"
                  },

                  "& .MuiCheckbox-root": {
                    color: "#8B96AB"
                  },

                  "& .MuiDataGrid-filler": {
                    backgroundColor: "#101526"
                  },

                  "& .MuiDataGrid-scrollbarFiller": {
                    backgroundColor: "#101526"
                  }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default Applications;