"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

export function InterestButton({ phone, message, product }: { phone: string; message: string; product: string }) {
  const base = `https://wa.me/${phone}?text=${encodeURIComponent(`${message} ${product}`)}`;
  const [href, setHref] = useState(base);
  useEffect(() => { setHref(`https://wa.me/${phone}?text=${encodeURIComponent(`${message} ${product} — ${window.location.href}`)}`); }, [phone, message, product]);
  return <a className="button interest-button" target="_blank" rel="noreferrer" href={href}><MessageCircle aria-hidden="true" /> TENHO INTERESSE</a>;
}
