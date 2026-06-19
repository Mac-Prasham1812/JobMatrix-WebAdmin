import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";

import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../firebase/firebase";

function Employers() {
  const [employers, setEmployers] = useState([]);
  const [filteredEmployers, setFilteredEmployers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployers();
  }, []);

  useEffect(() => {
    const value = search.toLowerCase().trim();

    const filtered = employers.filter((employer) => {
      const name = (employer.name || "").toLowerCase();
      const email = (employer.email || "").toLowerCase();
      const phone = (employer.phone || "").toLowerCase();

      return (
        name.includes(value) ||
        email.includes(value) ||
        phone.includes(value)
      );
    });

    setFilteredEmployers(filtered);
  }, [search, employers]);

  const loadEmployers = async () => {
    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "Employer")
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setEmployers(data);
      setFilteredEmployers(data);
    } catch (error) {
      console.log("Error loading employers:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      field: "name",
      headerName: "Name",
      flex: 1.2,
      minWidth: 160
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1.6,
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
      minWidth: 120
    },
    {
      field: "uid",
      headerName: "UID",
      flex: 2,
      minWidth: 260
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
                Employers
              </Typography>
              <Typography color="#8B96AB" sx={{ mt: 1 }}>
                Manage all registered employers.
              </Typography>
            </Box>

            <BusinessIcon
              sx={{
                fontSize: 50,
                color: "#A855F7"
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
            placeholder="Search employer..."
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
                height: 600,
                width: "100%",
                "& .MuiDataGrid-root": {
                  border: 0
                }
              }}
            >
              <DataGrid
                rows={filteredEmployers}
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

                  "& .MuiDataGrid-toolbarContainer": {
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

export default Employers;