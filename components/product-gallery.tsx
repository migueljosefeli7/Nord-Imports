"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const galleryImages = useMemo(() => [...new Set(images.filter(Boolean))], [images]);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const touchStart = useRef<number | null>(null);
  const total = galleryImages.length;
  if (!total) return null;

  function previous() { setActive((current) => (current - 1 + total) % total); }
  function next() { setActive((current) => (current + 1) % total); }
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
    if (event.key === "ArrowRight") { event.preventDefault(); next(); }
  }

  return <section className="product-gallery" aria-label={`Galeria de imagens de ${name}`} onKeyDown={onKeyDown} tabIndex={0} onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (touchStart.current === null) return; const distance = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(distance) > 45) { if (distance > 0) previous(); else next(); } touchStart.current = null; }}>
    <div className="gallery-toolbar"><div><span>FOTO {String(active + 1).padStart(2, "0")}</span><p>{total} {total === 1 ? "imagem disponível" : "imagens disponíveis"}</p></div><button type="button" onClick={() => setExpanded(true)} aria-label="Ampliar imagem selecionada"><Expand /> AMPLIAR</button></div>
    <div className="gallery-main">
      <Image src={galleryImages[active]} alt={`${name} — foto ${active + 1}`} fill sizes="(max-width: 1024px) 100vw, 62vw" priority unoptimized={galleryImages[active].startsWith("http")} />
      {total > 1 && <><button className="gallery-arrow previous" type="button" onClick={previous} aria-label="Foto anterior"><ArrowLeft /></button><button className="gallery-arrow next" type="button" onClick={next} aria-label="Próxima foto"><ArrowRight /></button></>}
      <span className="gallery-counter">{String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
    </div>
    {total > 1 && <div className="gallery-thumbs" role="tablist" aria-label="Escolher imagem">{galleryImages.map((image, index) => <button type="button" role="tab" aria-selected={index === active} aria-label={`Foto ${index + 1}`} onClick={() => setActive(index)} key={`${image}-${index}`}><Image src={image} alt="" fill sizes="110px" unoptimized={image.startsWith("http")} /><span>{String(index + 1).padStart(2, "0")}</span></button>)}</div>}
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="gallery-lightbox" showCloseButton={false}><DialogTitle className="sr-only">{name} — imagem ampliada</DialogTitle><DialogDescription className="sr-only">Use as setas para navegar pelas imagens.</DialogDescription><DialogClose asChild><button className="gallery-lightbox-close" aria-label="Fechar imagem ampliada"><X /></button></DialogClose><div className="gallery-lightbox-image"><Image src={galleryImages[active]} alt={`${name} — foto ${active + 1} ampliada`} fill sizes="100vw" priority unoptimized={galleryImages[active].startsWith("http")} /></div>{total > 1 && <div className="gallery-lightbox-controls"><button onClick={previous} aria-label="Foto anterior"><ArrowLeft /></button><span>{active + 1} / {total}</span><button onClick={next} aria-label="Próxima foto"><ArrowRight /></button></div>}</DialogContent></Dialog>
  </section>;
}
