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
  Divider
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import SchoolIcon from "@mui/icons-material/School";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";

import { db } from "../firebase/firebase";

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
      flex: 1.2,
      minWidth: 170
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
            color: "#A5B4FC",
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
          <IconButton
            onClick={() => handleView(params.row)}
            size="small"
            sx={{ color: "#6366F1" }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>

          <IconButton
            onClick={() => handleDeleteClick(params.row)}
            size="small"
            sx={{ color: "#EF4444" }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      )
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
                Students
              </Typography>
              <Typography color="#8B96AB" sx={{ mt: 1 }}>
                Manage all registered students.
              </Typography>
            </Box>

            <SchoolIcon
              sx={{
                fontSize: 50,
                color: "#6366F1"
              }}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, mt: 2.5, flexWrap: "wrap" }}>
            <Chip
              label={`Total Students: ${stats.total}`}
              sx={{
                bgcolor: "rgba(99,102,241,0.12)",
                color: "#A5B4FC",
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
          background: "#101526",
          border: "1px solid #1C2333",
          boxShadow: "0 10px 24px rgba(0,0,0,0.16)"
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
                height: 620,
                width: "100%",
                "& .MuiDataGrid-root": {
                  border: 0
                }
              }}
            >
              <DataGrid
                rows={filteredStudents}
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

      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: "#0D1220",
            color: "#fff",
            border: "1px solid #1C2333",
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Student Details</DialogTitle>
        <DialogContent>
          <Divider sx={{ borderColor: "#1C2333", mb: 2 }} />
          {selectedStudent && (
            <Stack spacing={1.5}>
              <Typography><b>Name:</b> {selectedStudent.name || "-"}</Typography>
              <Typography><b>Email:</b> {selectedStudent.email || "-"}</Typography>
              <Typography><b>Phone:</b> {selectedStudent.phone || "-"}</Typography>
              <Typography><b>Role:</b> {selectedStudent.role || "-"}</Typography>
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
        PaperProps={{
          sx: {
            backgroundColor: "#0D1220",
            color: "#fff",
            border: "1px solid #1C2333",
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Student</DialogTitle>
        <DialogContent>
          <Divider sx={{ borderColor: "#1C2333", mb: 2 }} />
          <Typography>
            Are you sure you want to delete{" "}
            <b>{deleteTarget?.name || "this student"}</b>?
          </Typography>
          <Typography sx={{ mt: 1, color: "#8B96AB" }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            variant="outlined"
            disabled={deleting}
            sx={{ borderColor: "#1C2333", color: "#fff" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            disabled={deleting}
            sx={{
              bgcolor: "#EF4444",
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