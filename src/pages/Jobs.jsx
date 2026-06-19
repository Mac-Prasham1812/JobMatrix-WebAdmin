import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import WorkIcon from "@mui/icons-material/Work";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs } from "firebase/firestore";

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
      minWidth: 180
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
              fontWeight: 700
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
                Jobs
              </Typography>
              <Typography color="#8B96AB" sx={{ mt: 1 }}>
                Manage all job posts from employers.
              </Typography>
            </Box>

            <WorkIcon
              sx={{
                fontSize: 50,
                color: "#22C55E"
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
              label={`Active: ${stats.active}`}
              sx={{
                bgcolor: "rgba(34,197,94,0.12)",
                color: "#86EFAC",
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
          background: "#101526",
          border: "1px solid #1C2333",
          boxShadow: "0 10px 24px rgba(0,0,0,0.16)"
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
                rows={filteredJobs}
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

export default Jobs;