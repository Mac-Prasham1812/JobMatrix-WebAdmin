import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  Alert
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in both fields.");
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);

      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      const role = userDoc.exists() ? userDoc.data().role : null;

      if (role !== "Admin") {
        setError("This account does not have admin access.");
        await auth.signOut();
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(135deg,#0A0E1A,#101526,#0A0E1A)",
        backgroundSize: "300% 300%",
        animation: "bg 12s ease infinite",
        "@keyframes bg": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" }
        }
      }}
    >
      <Box sx={{
        position:"absolute",width:350,height:350,borderRadius:"50%",
        bgcolor:"rgba(99,102,241,.12)",filter:"blur(120px)",
        top:-80,left:-80,animation:"f1 8s ease-in-out infinite",
        "@keyframes f1":{"50%":{transform:"translateY(30px)"}}
      }}/>
      <Box sx={{
        position:"absolute",width:300,height:300,borderRadius:"50%",
        bgcolor:"rgba(99,102,241,.08)",filter:"blur(120px)",
        bottom:-80,right:-80,animation:"f2 10s ease-in-out infinite",
        "@keyframes f2":{"50%":{transform:"translateY(-35px)"}}
      }}/>
      <motion.div
        initial={{opacity:0,y:40,scale:.95}}
        animate={{opacity:1,y:0,scale:1}}
        transition={{duration:.7}}
        style={{width:"100%",maxWidth:430,padding:16}}
      >
        <Card sx={{
          borderRadius:5,
          background:"rgba(16,21,38,.88)",
          backdropFilter:"blur(24px)",
          border:"1px solid rgba(255,255,255,.08)",
          boxShadow:"0 25px 60px rgba(0,0,0,.45),0 0 40px rgba(99,102,241,.08)",
          transition:".35s",
          "&:hover":{
            transform:"translateY(-4px)",
            boxShadow:"0 30px 70px rgba(0,0,0,.55),0 0 55px rgba(99,102,241,.16)"
          }
        }}>
          <CardContent sx={{p:4}}>
            <motion.div
              animate={{scale:[1,1.08,1],rotate:[0,5,-5,0]}}
              transition={{duration:5,repeat:Infinity}}
            >
              <Box sx={{
                width:72,height:72,borderRadius:"50%",
                background:"linear-gradient(135deg,#6366F1,#818CF8)",
                display:"flex",alignItems:"center",justifyContent:"center",
                mx:"auto",mb:2,
                boxShadow:"0 0 30px rgba(99,102,241,.35)"
              }}>
                <Typography sx={{fontSize:30,fontWeight:800,color:"#fff"}}>J</Typography>
              </Box>
            </motion.div>

            <Typography variant="h4" fontWeight={800} color="#F8FAFC" align="center">
              Admin Login
            </Typography>

            <Typography align="center" color="#8B96AB" sx={{mt:1,mb:3}}>
              Sign in to access the JobMatrix dashboard
            </Typography>

            {error && (
              <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}>
                <Alert severity="error" sx={{mb:2,borderRadius:2}}>
                  {error}
                </Alert>
              </motion.div>
            )}

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                sx={{
                  mb:2.5,
                  "& .MuiInputLabel-root":{color:"#8B96AB"},
                  "& .MuiOutlinedInput-root":{
                    color:"#fff",
                    bgcolor:"#0D1220",
                    borderRadius:3,
                    transition:".3s",
                    "& fieldset":{borderColor:"#1C2333"},
                    "&:hover":{transform:"translateY(-2px)"},
                    "&:hover fieldset":{borderColor:"#2A3447"},
                    "&.Mui-focused":{
                      boxShadow:"0 0 16px rgba(99,102,241,.25)"
                    },
                    "&.Mui-focused fieldset":{borderColor:"#6366F1"}
                  }
                }}
                InputProps={{
                  startAdornment:<InputAdornment position="start"><EmailIcon sx={{color:"#8B96AB"}}/></InputAdornment>
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                sx={{
                  mb:3,
                  "& .MuiInputLabel-root":{color:"#8B96AB"},
                  "& .MuiOutlinedInput-root":{
                    color:"#fff",
                    bgcolor:"#0D1220",
                    borderRadius:3,
                    transition:".3s",
                    "& fieldset":{borderColor:"#1C2333"},
                    "&:hover":{transform:"translateY(-2px)"},
                    "&:hover fieldset":{borderColor:"#2A3447"},
                    "&.Mui-focused":{
                      boxShadow:"0 0 16px rgba(99,102,241,.25)"
                    },
                    "&.Mui-focused fieldset":{borderColor:"#6366F1"}
                  }
                }}
                InputProps={{
                  startAdornment:<InputAdornment position="start"><LockIcon sx={{color:"#8B96AB"}}/></InputAdornment>
                }}
              />

              <Button
                type="submit"
                fullWidth
                disabled={loading}
                variant="contained"
                sx={{
                  py:1.5,
                  borderRadius:3,
                  fontWeight:800,
                  background:"linear-gradient(135deg,#6366F1,#4F46E5)",
                  boxShadow:"0 10px 25px rgba(99,102,241,.35)",
                  transition:".35s",
                  "&:hover":{
                    transform:"translateY(-3px)",
                    background:"linear-gradient(135deg,#6366F1,#4338CA)"
                  }
                }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
}

export default Login;
