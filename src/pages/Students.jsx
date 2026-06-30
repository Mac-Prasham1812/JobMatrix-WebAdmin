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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Divider,
  Avatar,
  Tooltip,
  Fade
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import SchoolIcon from "@mui/icons-material/School";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonIcon from "@mui/icons-material/Person";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";

import { db } from "../firebase/firebase";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

function Students() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    const value = search.toLowerCase().trim();

    const filtered = students.filter((student) => {
      const name = (student.name || "").toLowerCase();
      const email = (student.email || "").toLowerCase();
      const phone = (student.phone || "").toLowerCase();
      const uid = (student.uid || "").toLowerCase();
      return (
        name.includes(value) ||
        email.includes(value) ||
        phone.includes(value) ||
        uid.includes(value)
      );
    });

    setFilteredStudents(filtered);
  }, [search, students]);

  const loadStudents = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "Student"));
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      setStudents(data);
      setFilteredStudents(data);
    } catch (error) {
      console.log("Error loading students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (student) => {
    setSelectedStudent(student);
    setViewOpen(true);
  };

  const handleDeleteClick = (student) => {
    setDeleteTarget(student);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", deleteTarget.id));

      const updated = students.filter((s) => s.id !== deleteTarget.id);
      setStudents(updated);
      setFilteredStudents(
        updated.filter((student) => {
          const value = search.toLowerCase().trim();
          const name = (student.name || "").toLowerCase();
          const email = (student.email || "").toLowerCase();
          const phone = (student.phone || "").toLowerCase();
          const uid = (student.uid || "").toLowerCase();
          return (
            name.includes(value) ||
            email.includes(value) ||
            phone.includes(value) ||
            uid.includes(value)
          );
        })
      );

      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.log("Delete student error:", error);
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: students.length
    };
  }, [students]);

  const columns = [
    {
      field: "name",
      headerName: "Name",
      flex: 1.3,
      minWidth: 200,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.3} alignItems="center" sx={{ height: "100%" }}>
          <Avatar
            sx={{
              width: 30,
              height: 30,
              fontSize: 12,
              fontWeight: 700,
              bgcolor: "rgba(99,102,241,0.16)",
              color: "primary.light",
              border: "1px solid rgba(99,102,241,0.3)"
            }}
          >
            {initials(params.value)}
          </Avatar>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>
            {params.value || "-"}
          </Typography>
        </Stack>
      )
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1.5,
      minWidth: 220
    },
    {
      field: "phone",
      headerName: "Phone",
      flex: 1,
      minWidth: 140
    },
    {
      field: "role",
      headerName: "Role",
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => (
        <Chip
          label={params.value || "Student"}
          size="small"
          sx={{
            bgcolor: "rgba(99,102,241,0.12)",
            color: "primary.light",
            border: "1px solid rgba(99,102,241,0.22)",
            fontWeight: 700
          }}
        />
      )
    },
    {
      field: "uid",
      headerName: "UID",
      flex: 2,
      minWidth: 260
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View details">
            <IconButton
              onClick={() => handleView(params.row)}
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

          <Tooltip title="Delete student">
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
        </Stack>
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
            background: "radial-gradient(circle, rgba(99,102,241,0.22), transparent 70%)",
            animation: "driftA 9s ease-in-out infinite",
            pointerEvents: "none"
          }}
        />
        <CardContent sx={{ p: 3, position: "relative" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} color="text.primary">
                Students
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Manage all registered students.
              </Typography>
            </Box>

            <SchoolIcon sx={{ fontSize: 50, color: "primary.main" }} />
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, mt: 2.5, flexWrap: "wrap" }}>
            <Chip
              icon={<PersonIcon sx={{ fontSize: 16, color: "primary.light !important" }} />}
              label={`Total Students: ${stats.total}`}
              sx={{
                bgcolor: "rgba(99,102,241,0.12)",
                color: "primary.light",
                border: "1px solid rgba(99,102,241,0.22)",
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
            placeholder="Search student..."
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
                "&.Mui-focused fieldset": { borderColor: "primary.main" },
                "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(99,102,241,0.18)" }
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
              <CircularProgress sx={{ color: "primary.main" }} />
              <Typography color="text.secondary" fontSize={13}>
                Loading students...
              </Typography>
            </Box>
          ) : filteredStudents.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={8} sx={{ animation: "fadeIn 0.35s ease" }}>
              <SchoolIcon sx={{ fontSize: 42, color: "text.secondary", opacity: 0.5 }} />
              <Typography color="text.secondary">No students found.</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                height: 620,
                width: "100%",
                animation: "fadeIn 0.4s ease",
                "& .MuiDataGrid-root": { border: 0 }
              }}
            >
              <DataGrid
                rows={filteredStudents}
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
        open={viewOpen}
        onClose={() => setViewOpen(false)}
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
        <DialogTitle sx={{ fontWeight: 700 }}>Student Details</DialogTitle>
        <DialogContent>
          <Divider sx={{ borderColor: "divider", mb: 2 }} />
          {selectedStudent && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    fontWeight: 700,
                    bgcolor: "rgba(99,102,241,0.16)",
                    color: "primary.light",
                    border: "1px solid rgba(99,102,241,0.3)"
                  }}
                >
                  {initials(selectedStudent.name)}
                </Avatar>
                <Box>
                  <Typography fontWeight={700}>{selectedStudent.name || "-"}</Typography>
                  <Typography fontSize={13} color="text.secondary">
                    {selectedStudent.role || "Student"}
                  </Typography>
                </Box>
              </Stack>
              <Typography><b>Email:</b> {selectedStudent.email || "-"}</Typography>
              <Typography><b>Phone:</b> {selectedStudent.phone || "-"}</Typography>
              <Typography sx={{ wordBreak: "break-word" }}><b>UID:</b> {selectedStudent.uid || "-"}</Typography>
              <Typography sx={{ wordBreak: "break-word" }}>
                <b>Document ID:</b> {selectedStudent.id || "-"}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setViewOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

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
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Student</DialogTitle>
        <DialogContent>
          <Divider sx={{ borderColor: "divider", mb: 2 }} />
          <Typography>
            Are you sure you want to delete <b>{deleteTarget?.name || "this student"}</b>?
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            This action cannot be undone.
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
    </Box>
  );
}

export default Students;
