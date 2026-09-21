import { useEffect, useRef, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";

// Live count of unread admin notifications. onNew fires when a new unread doc arrives.
export default function useUnreadCount(onNew) {
  const [count, setCount] = useState(0);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    const q = query(collection(db, "adminNotifications"), where("isRead", "==", false));
    let first = true;

    const unsub = onSnapshot(
      q,
      (snap) => {
        setCount(snap.size);
        if (!first && snap.docChanges().some((c) => c.type === "added")) {
          if (onNewRef.current) onNewRef.current();
        }
        first = false;
      },
      () => setCount(0)
    );

    return () => unsub();
  }, []);

  return count;
}