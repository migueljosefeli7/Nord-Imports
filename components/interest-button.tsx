"use client";

import { MessageCircle } from "lucide-react";

export function InterestButton({ phone, message, product }: { phone: string; message: string; product: string }) {
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(`${message} ${product}`)}`;
  return <a className="button interest-button" target="_blank" rel="noreferrer" href={href} onClick={(event) => { event.currentTarget.href = `https://wa.me/${phone}?text=${encodeURIComponent(`${message} ${product} — ${window.location.href}`)}`; }}><MessageCircle aria-hidden="true" /> TENHO INTERESSE</a>;
}
