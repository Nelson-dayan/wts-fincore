"use client";

import { useCallback, useState } from "react";

export function useSaveFeedback(defaultSuccessMessage = "Updated successfully.") {
  const [successMessage, setSuccessMessage] = useState("");

  const clearSaveFeedback = useCallback(() => {
    setSuccessMessage("");
  }, []);

  const showSaveSuccess = useCallback(
    (message = defaultSuccessMessage) => {
      setSuccessMessage(message);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.setTimeout(() => {
          setSuccessMessage("");
        }, 2600);
      }
    },
    [defaultSuccessMessage]
  );

  return {
    successMessage,
    clearSaveFeedback,
    showSaveSuccess,
  };
}
