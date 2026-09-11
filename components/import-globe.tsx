"use client";

import createGlobe from "cobe";
import { useEffect, useRef, useState } from "react";

const BRAZIL: [number, number] = [-27.5954, -48.548];
const ROUTES = [
  { id: "china", label: "China", from: [35.8617, 104.1954] as [number, number] },
  { id: "usa", label: "Estados Unidos", from: [37.0902, -95.7129] as [number, number] },
  { id: "canada", label: "Canadá", from: [56.1304, -106.3468] as [number, number] },
];

export function ImportGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStart = useRef<number | null>(null);
  const dragOffset = useRef(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let phi = -0.45;
    let width = canvas.offsetWidth;
    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: width * dpr,
      height: width * dpr,
      phi,
      theta: 0.18,
      dark: 1,
      diffuse: 1.25,
      mapSamples: 18000,
      mapBrightness: 5.5,
      mapBaseBrightness: 0.08,
      baseColor: [0.035, 0.055, 0.11],
      markerColor: [0.15, 0.39, 0.92],
      glowColor: [0.07, 0.16, 0.36],
      markerElevation: 0.025,
      markers: [
        { location: BRAZIL, size: 0.115, color: [0.15, 0.39, 0.92], id: "brasil" },
        ...ROUTES.map((route) => ({ location: route.from, size: 0.055, id: route.id })),
      ],
      arcs: ROUTES.map((route) => ({ from: route.from, to: BRAZIL, id: `${route.id}-brasil` })),
      arcColor: [0.35, 0.58, 1],
      arcWidth: 1.1,
      arcHeight: 0.28,
      opacity: 0.94,
    });

    const resize = () => {
      width = canvas.offsetWidth;
      globe.update({ width: width * dpr, height: width * dpr });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const animate = () => {
      if (!reducedMotion && dragStart.current === null) phi += 0.0016;
      globe.update({ phi: phi + dragOffset.current });
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      globe.destroy();
    };
  }, []);

  const release = () => {
    dragStart.current = null;
    setDragging(false);
  };

  return (
    <div className="import-globe-wrap">
      <div className="globe-orbit" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="import-globe-canvas"
        aria-label="Globo interativo com rotas da China, Estados Unidos e Canadá conectadas ao Brasil"
        role="img"
        onPointerDown={(event) => {
          dragStart.current = event.clientX - dragOffset.current * 220;
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragStart.current !== null) dragOffset.current = (event.clientX - dragStart.current) / 220;
        }}
        onPointerUp={release}
        onPointerCancel={release}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      />
      <div className="globe-destination"><span />BRASIL <small>DESTINO NORD</small></div>
    </div>
  );
}
