import { useState } from "react";
import { Button } from "@mui/material";

export default function ShareButton({ title, text, url }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); }
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true); setTimeout(() => setCopied(false), 1500);
      }
    } catch {}
  };
  return (
    <Button variant="outlined" onClick={share}>
      {copied ? "Link copied!" : "Share"}
    </Button>
  );
}