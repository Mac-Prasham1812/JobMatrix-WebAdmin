import { useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

function TestFirebase() {

  useEffect(() => {

    const testConnection = async () => {

      try {

        const usersSnapshot =
          await getDocs(collection(db, "users"));

        console.log(
          "Users Found:",
          usersSnapshot.size
        );

      } catch (error) {

        console.error(error);

      }
    };

    testConnection();

  }, []);

  return (
    <h1>Firebase Connected</h1>
  );
}

export default TestFirebase;