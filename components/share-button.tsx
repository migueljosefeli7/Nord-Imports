"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton() {
  const [feedback, setFeedback] = useState("");
  async function share() {
    try {
      const nativeShare = typeof navigator.share === "function";
      if (nativeShare) await navigator.share({ title: document.title, url: location.href });
      else await navigator.clipboard.writeText(location.href);
      setFeedback(nativeShare ? "COMPARTILHADO" : "LINK COPIADO");
      window.setTimeout(() => setFeedback(""), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback("NÃO FOI POSSÍVEL");
      window.setTimeout(() => setFeedback(""), 2200);
    }
  }
  return <button type="button" className="button ghost" style={{ color: "#090b10", borderColor: "#090b10" }} onClick={share} aria-live="polite"><Share2 />{feedback || "COMPARTILHAR"}</button>;
}
