"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Expand, Play, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isVideoUrl } from "@/lib/media";

function Media({ url, name, index, expanded = false }: { url: string; name: string; index: number; expanded?: boolean }) {
  if (isVideoUrl(url)) return <video key={url} src={url} controls playsInline preload="metadata" aria-label={`${name} — vídeo ${index + 1}`} />;
  return <Image src={url} alt={`${name} — foto ${index + 1}${expanded ? " ampliada" : ""}`} fill sizes={expanded ? "100vw" : "(max-width: 1024px) 100vw, 62vw"} priority={index === 0} unoptimized={url.startsWith("http")} />;
}

export function ProductGallery({ media, name }: { media: string[]; name: string }) {
  const items = useMemo(() => [...new Set(media.filter(Boolean))], [media]);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const touchStart = useRef<number | null>(null);
  const didSwipe = useRef(false);
  const total = items.length;
  const currentIsVideo = isVideoUrl(items[active] || "");

  if (!total) return null;
  function previous() { setActive((current) => (current - 1 + total) % total); }
  function next() { setActive((current) => (current + 1) % total); }
  function onKeyDown(event: KeyboardEvent<HTMLElement>) { if (event.key === "ArrowLeft") { event.preventDefault(); previous(); } if (event.key === "ArrowRight") { event.preventDefault(); next(); } }

  return <section className="product-gallery" aria-label={`Galeria de fotos e vídeos de ${name}`} onKeyDown={onKeyDown} tabIndex={0} onTouchStart={(event) => { didSwipe.current = false; touchStart.current = event.changedTouches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (touchStart.current === null) return; const distance = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(distance) > 45) { didSwipe.current = true; if (distance > 0) previous(); else next(); } touchStart.current = null; }}>
    <div className="gallery-toolbar"><div><span>{currentIsVideo ? "VÍDEO" : "FOTO"} {String(active + 1).padStart(2, "0")}</span><p>{total} {total === 1 ? "mídia disponível" : "fotos e vídeos disponíveis"}</p></div><button type="button" onClick={() => setExpanded(true)} aria-label={`Ampliar ${currentIsVideo ? "vídeo" : "imagem"} selecionado`}><Expand /> AMPLIAR</button></div>
    <div className={`gallery-main ${currentIsVideo ? "is-video" : ""}`} onClick={(event) => { if (didSwipe.current) { didSwipe.current = false; return; } if (currentIsVideo || event.target instanceof Element && event.target.closest("button, video")) return; if (window.matchMedia("(max-width: 768px)").matches) setExpanded(true); }}><Media url={items[active]} name={name} index={active} />{total > 1 && <><button className="gallery-arrow previous" type="button" onClick={previous} aria-label="Item anterior"><ArrowLeft /></button><button className="gallery-arrow next" type="button" onClick={next} aria-label="Próximo item"><ArrowRight /></button></>}<span className="gallery-counter">{String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span></div>
    {total > 1 && <div className="gallery-thumbs" role="tablist" aria-label="Escolher foto ou vídeo">{items.map((item, index) => <button type="button" role="tab" aria-selected={index === active} aria-label={`${isVideoUrl(item) ? "Vídeo" : "Foto"} ${index + 1}`} onClick={() => setActive(index)} key={`${item}-${index}`}>{isVideoUrl(item) ? <><video src={item} muted playsInline preload="metadata" /><i className="video-thumb"><Play /></i></> : <Image src={item} alt="" fill sizes="110px" unoptimized={item.startsWith("http")} />}<span>{String(index + 1).padStart(2, "0")}</span></button>)}</div>}
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="gallery-lightbox" showCloseButton={false}><DialogTitle className="sr-only">{name} — mídia ampliada</DialogTitle><DialogDescription className="sr-only">Use as setas para navegar pelas fotos e vídeos.</DialogDescription><DialogClose asChild><button className="gallery-lightbox-close" aria-label="Fechar mídia ampliada"><X /></button></DialogClose><div className={`gallery-lightbox-image ${currentIsVideo ? "is-video" : ""}`}><Media url={items[active]} name={name} index={active} expanded /></div>{total > 1 && <div className="gallery-lightbox-controls"><button onClick={previous} aria-label="Item anterior"><ArrowLeft /></button><span>{active + 1} / {total}</span><button onClick={next} aria-label="Próximo item"><ArrowRight /></button></div>}</DialogContent></Dialog>
  </section>;
}
