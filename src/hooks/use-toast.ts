import { useState } from "react";

export function useToast() {
  const [message, setMessage] = useState("");

  const toast = (msg: string) => {
    setMessage(msg);
    // maybe add more toast logic here
  };

  return { message, toast };
}