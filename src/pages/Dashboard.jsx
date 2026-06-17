import { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Avatar,
  Divider
} from "@mui/material";

import SchoolIcon from "@mui/icons-material/School";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { db } from "../firebase/firebase";

function Dashboard() {
  const [students, setStudents] = useState(0);
  const [employers, setEmployers] = useState(0);
  const [jobs, setJobs] = useState(0);
  const [applications, setApplications] = useState(0);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "Student")
      );

      const studentSnapshot = await getDocs(studentsQuery);
      setStudents(studentSnapshot.size);

      const employersQuery = query(
        collection(db, "users"),
        where("role", "==", "Employer")
      );

      const employerSnapshot = await getDocs(employersQuery);
      setEmployers(employerSnapshot.size);

      const jobsSnapshot =
        await getDocs(collection(db, "jobs"));
      setJobs(jobsSnapshot.size);

      const applicationsSnapshot =
        await getDocs(collection(db, "applications"));
      setApplications(applicationsSnapshot.size);

    } catch (error) {
      console.log(error);
    }
  };

  const cards = [
    {
      title: "Students",
      value: students,
      color: "#3B82F6",
      icon: <SchoolIcon sx={{ fontSize: 38 }} />
    },
    {
      title: "Employers",
      value: employers,
      color: "#8B5CF6",
      icon: <BusinessIcon sx={{ fontSize: 38 }} />
    },
    {
      title: "Jobs",
      value: jobs,
      color: "#10B981",
      icon: <WorkIcon sx={{ fontSize: 38 }} />
    },
    {
      title: "Applications",
      value: applications,
      color: "#F59E0B",
      icon: <AssignmentIcon sx={{ fontSize: 38 }} />
    }
  ];

  return (
    <Box>

      {/* Page Title */}

      <Typography
        variant="h3"
        fontWeight="bold"
        sx={{
          mb: 3,
          color: "#ffffff"
        }}
      >
        Dashboard Overview
      </Typography>

      {/* Welcome Banner */}

      <Card
        sx={{
          mb: 4,
          borderRadius: 4,
          background:
            "linear-gradient(135deg,#2563EB,#7C3AED)",
          color: "#fff"
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h4"
            fontWeight="bold"
          >
            Welcome Back, Admin 👋
          </Typography>

          <Typography
            sx={{
              mt: 1,
              opacity: 0.9
            }}
          >
            Manage students, employers,
            jobs and applications from
            one centralized dashboard.
          </Typography>
        </CardContent>
      </Card>

      {/* Stats Cards */}

      <Grid container spacing={3}>

        {cards.map((card, index) => (

          <Grid
            key={index}
            size={{
              xs: 12,
              sm: 6,
              md: 3
            }}
          >

            <Card
              sx={{
                background: "#111827",
                color: "#fff",
                borderRadius: 4,
                height: "100%",
                transition: "0.3s",

                "&:hover": {
                  transform: "translateY(-6px)",
                  boxShadow:
                    "0px 10px 25px rgba(0,0,0,0.35)"
                }
              }}
            >

              <CardContent>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >

                  <Box>

                    <Typography
                      sx={{
                        color: "#94A3B8"
                      }}
                    >
                      {card.title}
                    </Typography>

                    <Typography
                      variant="h3"
                      fontWeight="bold"
                    >
                      {card.value}
                    </Typography>

                  </Box>

                  <Avatar
                    sx={{
                      bgcolor: card.color,
                      width: 60,
                      height: 60
                    }}
                  >
                    {card.icon}
                  </Avatar>

                </Stack>

                <Box mt={2}>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                  >

                    <TrendingUpIcon
                      sx={{
                        color: "#10B981",
                        fontSize: 18
                      }}
                    />

                    <Typography
                      variant="body2"
                      color="#10B981"
                    >
                      Active Records
                    </Typography>

                  </Stack>

                </Box>

              </CardContent>

            </Card>

          </Grid>

        ))}

      </Grid>

      {/* Bottom Section */}

      <Grid
        container
        spacing={3}
        sx={{ mt: 2 }}
      >

        <Grid
          size={{
            xs: 12,
            md: 6
          }}
        >

          <Card
            sx={{
              background: "#111827",
              color: "#fff",
              borderRadius: 4,
              minHeight: 300
            }}
          >

            <CardContent>

              <Typography
                variant="h6"
                fontWeight="bold"
              >
                Recent Applications
              </Typography>

              <Divider
                sx={{
                  my: 2,
                  borderColor: "#334155"
                }}
              />

              <Typography color="#94A3B8">
                Applications table will
                appear here.
              </Typography>

            </CardContent>

          </Card>

        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 6
          }}
        >

          <Card
            sx={{
              background: "#111827",
              color: "#fff",
              borderRadius: 4,
              minHeight: 300
            }}
          >

            <CardContent>

              <Typography
                variant="h6"
                fontWeight="bold"
              >
                Recent Jobs
              </Typography>

              <Divider
                sx={{
                  my: 2,
                  borderColor: "#334155"
                }}
              />

              <Typography color="#94A3B8">
                Jobs table will appear
                here.
              </Typography>

            </CardContent>

          </Card>

        </Grid>

      </Grid>

    </Box>
  );
}

export default Dashboard;