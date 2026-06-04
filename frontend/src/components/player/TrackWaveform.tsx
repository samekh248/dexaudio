import { useCallback, useEffect, useRef, useState } from "react";
import { useTrackWaveform } from "@/hooks/use-track-waveform";
import { cn } from "@/lib/utils";

const BAR_HEIGHT_PX = 64;
const GAP_PX = 1;

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function themeHslColor(styles: CSSStyleDeclaration, varName: string, alpha?: number): string {
  const raw = styles.getPropertyValue(varName).trim();
  if (!raw) {
    return alpha !== undefined ? `hsla(215 16% 47% / ${alpha})` : "hsl(215 16% 47%)";
  }
  if (raw.startsWith("hsl")) return raw;
  return alpha !== undefined ? `hsl(${raw} / ${alpha})` : `hsl(${raw})`;
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  samples: number[],
  width: number,
  height: number,
  color: string,
) {
  const count = samples.length;
  if (count === 0) return;
  const barWidth = Math.max(1, (width - GAP_PX * (count - 1)) / count);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = i * (barWidth + GAP_PX);
    const barH = Math.max(2, samples[i] * (height - 4));
    const y = (height - barH) / 2;
    ctx.fillRect(x, y, barWidth, barH);
  }
}

function drawWaveform(
  canvas: HTMLCanvasElement,
  samples: number[],
  playedRatio: number,
  playedColor: string,
  unplayedColor: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = BAR_HEIGHT_PX;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (samples.length === 0) return;

  drawBars(ctx, samples, width, height, unplayedColor);

  const playedWidth = playedRatio * width;
  if (playedWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, playedWidth, height);
    ctx.clip();
    drawBars(ctx, samples, width, height, playedColor);
    ctx.restore();
  }
}

export interface TrackWaveformProps {
  trackId: string;
  positionMs: number;
  durationMs: number;
  seekDisabled?: boolean;
  onSeek: (ms: number) => void;
  className?: string;
}

export function TrackWaveform({
  trackId,
  positionMs,
  durationMs,
  seekDisabled,
  onSeek,
  className,
}: TrackWaveformProps) {
  const { status, waveform } = useTrackWaveform(trackId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverMs, setHoverMs] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const draggingRef = useRef(false);

  const effectiveDuration = Math.max(
    durationMs > 0 ? durationMs : 0,
    waveform?.durationMs ?? 0,
  );
  const playedRatio =
    effectiveDuration > 0 ? Math.min(1, Math.max(0, positionMs / effectiveDuration)) : 0;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const themeEl = containerRef.current ?? document.documentElement;
    if (!canvas || !waveform?.samples.length) return;
    const styles = getComputedStyle(themeEl);
    const highlight = styles.getPropertyValue("--now-playing-highlight").trim();
    const playedColor = highlight
      ? themeHslColor(styles, "--now-playing-highlight")
      : themeHslColor(styles, "--primary");
    const unplayedColor = themeHslColor(styles, "--muted-foreground", 0.35);
    drawWaveform(canvas, waveform.samples, playedRatio, playedColor, unplayedColor);
  }, [waveform, playedRatio]);

  useEffect(() => {
    if (status !== "ready" || !waveform) return;
    redraw();
    const ro = new ResizeObserver(() => redraw());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [status, waveform, redraw]);

  useEffect(() => {
    if (status !== "ready" || !waveform) return;
    redraw();
  }, [positionMs, status, waveform, redraw]);

  if (status !== "ready" || !waveform) return null;

  const mapXToMs = (clientX: number) => {
    const el = containerRef.current;
    if (!el || effectiveDuration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * effectiveDuration);
  };

  const handlePointerDown = () => {
    draggingRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (seekDisabled) return;
    if (e.buttons !== 0) draggingRef.current = true;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    const ms = mapXToMs(e.clientX);
    setHoverMs(ms);
    setHoverX(e.clientX - rect.left);
  };

  const handlePointerLeave = () => {
    setHoverMs(null);
    setHoverX(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (seekDisabled || draggingRef.current) {
      draggingRef.current = false;
      return;
    }
    onSeek(mapXToMs(e.clientX));
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
      style={{ height: BAR_HEIGHT_PX }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "block h-full w-full",
          seekDisabled ? "cursor-default" : "cursor-pointer",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      />
      {!seekDisabled && hoverMs !== null && hoverX !== null ? (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded bg-popover px-2 py-0.5 text-xs text-popover-foreground shadow"
          style={{ left: hoverX, transform: "translateX(-50%)" }}
        >
          {formatMs(hoverMs)}
        </div>
      ) : null}
    </div>
  );
}
