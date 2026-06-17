import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAMdZTuHfJAaVsorhULwREBBTC9HauPgw4",
  authDomain: "jobmatrix-5098d.firebaseapp.com",
  projectId: "jobmatrix-5098d",
  storageBucket: "jobmatrix-5098d.firebasestorage.app",
  messagingSenderId: "849887541998",
  appId: "1:849887541998:web:cf5b073749287398ba51ff",
  measurementId: "G-F72YB0F4F3"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export default app;