"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type FanStyle = CSSProperties & {
  "--fan-x": string;
  "--fan-y": string;
  "--fan-rotation": string;
  "--fan-scale": string;
  "--fan-z": number;
};

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const galleryImages = useMemo(() => images.filter(Boolean), [images]);
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
    if (event.key === "Home") { event.preventDefault(); setActive(0); }
    if (event.key === "End") { event.preventDefault(); setActive(total - 1); }
  }

  return <section className="product-fan-gallery" aria-label={`Galeria de imagens de ${name}`} onKeyDown={onKeyDown} tabIndex={0} onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (touchStart.current === null) return; const distance = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(distance) > 45) { if (distance > 0) previous(); else next(); } touchStart.current = null; }}>
    <div className="fan-heading"><div><span>VISUAL / {String(active + 1).padStart(2, "0")}</span><p>Selecione uma imagem para trazer ao centro.</p></div><button className="fan-expand" type="button" onClick={() => setExpanded(true)} aria-label="Ampliar imagem selecionada"><Expand /> AMPLIAR</button></div>
    <div className="product-fan-stage">
      {galleryImages.map((image, index) => {
        const offset = circularOffset(index, active, total);
        const distance = Math.abs(offset);
        const visible = distance <= 3;
        const style: FanStyle = { "--fan-x": `${offset * 8.4}rem`, "--fan-y": `${distance * distance * 0.8}rem`, "--fan-rotation": `${offset * 7}deg`, "--fan-scale": String(Math.max(.7, 1 - distance * .085)), "--fan-z": 20 - distance };
        return <button type="button" className="product-fan-card" data-active={index === active} data-visible={visible} data-distance={distance} style={style} onClick={() => index === active ? setExpanded(true) : setActive(index)} aria-label={index === active ? `Ampliar foto ${index + 1}` : `Selecionar foto ${index + 1}`} aria-current={index === active ? "true" : undefined} key={`${image}-${index}`}>
          <Image src={image} alt={`${name} — foto ${index + 1}`} fill sizes="(max-width: 640px) 68vw, (max-width: 1100px) 42vw, 30vw" priority={index === active} unoptimized={image.startsWith("http")} />
          <span>{String(index + 1).padStart(2, "0")}</span>
        </button>;
      })}
    </div>
    <div className="fan-controls">
      <button type="button" onClick={previous} disabled={total < 2} aria-label="Foto anterior"><ArrowLeft /></button>
      <div className="fan-progress" aria-label={`Foto ${active + 1} de ${total}`}><i style={{ width: `${((active + 1) / total) * 100}%` }} /></div>
      <span><b>{String(active + 1).padStart(2, "0")}</b> / {String(total).padStart(2, "0")}</span>
      <button type="button" onClick={next} disabled={total < 2} aria-label="Próxima foto"><ArrowRight /></button>
    </div>
    <div className="fan-dots" role="tablist" aria-label="Escolher imagem">{galleryImages.map((_, index) => <button type="button" role="tab" aria-selected={index === active} aria-label={`Foto ${index + 1}`} onClick={() => setActive(index)} key={index} />)}</div>

    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="gallery-lightbox" showCloseButton={false}><DialogTitle className="sr-only">{name} — imagem ampliada</DialogTitle><DialogDescription className="sr-only">Use as setas para navegar entre as imagens do produto.</DialogDescription><DialogClose asChild><button className="gallery-lightbox-close" aria-label="Fechar imagem ampliada"><X /></button></DialogClose><div className="gallery-lightbox-image"><Image src={galleryImages[active]} alt={`${name} — foto ${active + 1} ampliada`} fill sizes="100vw" priority unoptimized={galleryImages[active].startsWith("http")} /></div>{total > 1 && <div className="gallery-lightbox-controls"><button onClick={previous} aria-label="Foto anterior"><ArrowLeft /></button><span>{active + 1} / {total}</span><button onClick={next} aria-label="Próxima foto"><ArrowRight /></button></div>}</DialogContent></Dialog>
  </section>;
}

function circularOffset(index: number, center: number, total: number) {
  let offset = index - center;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}
