"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type { Mat } from "./matrix";
import { clamp, maxAbs } from "./matrix";

function divergingColor(v: number, max: number) {
  const m = Math.max(1e-12, max);
  const t = clamp(v / m, -1, 1);
  const a = Math.abs(t);

  // blue → white → red
  const base = 255 - Math.round(a * 140);
  if (t >= 0) return `rgb(255, ${base}, ${base})`;
  return `rgb(${base}, ${base}, 255)`;
}

export default function MatrixHeatmap({
  A,
  cell = 24,
  showNumbers = true,
  highlight,
  caption,
}: {
  A: Mat;
  cell?: number;
  showNumbers?: boolean;
  highlight?: { r0: number; r1: number; c0: number; c1: number };
  caption?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const m = A.length;
  const n = A[0]?.length ?? 0;
  const mx = useMemo(() => maxAbs(A), [A]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const W = n * cell;
    const H = m * cell;
    c.width = Math.max(1, W);
    c.height = Math.max(1, H);

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = divergingColor(A[i][j], mx || 1);
        ctx.fillRect(j * cell, i * cell, cell, cell);
      }
    }

    if (highlight) {
      const { r0, r1, c0, c1 } = highlight;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        c0 * cell + 1,
        r0 * cell + 1,
        (c1 - c0 + 1) * cell - 2,
        (r1 - r0 + 1) * cell - 2
      );
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= m; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cell + 0.5);
      ctx.lineTo(W, i * cell + 0.5);
      ctx.stroke();
    }
    for (let j = 0; j <= n; j++) {
      ctx.beginPath();
      ctx.moveTo(j * cell + 0.5, 0);
      ctx.lineTo(j * cell + 0.5, H);
      ctx.stroke();
    }
    ctx.restore();

    if (showNumbers) {
      ctx.save();
      ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillText(String(A[i][j]), j * cell + cell / 2 + 1, i * cell + cell / 2 + 1);
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillText(String(A[i][j]), j * cell + cell / 2, i * cell + cell / 2);
        }
      }
      ctx.restore();
    }
  }, [A, cell, m, n, mx, showNumbers, highlight]);

  return (
    <div className="w-full">
      {caption ? (
        <div className="mb-2 text-xs font-extrabold text-white/70">{caption}</div>
      ) : null}

      <div className="overflow-auto rounded-xl border border-white/10 bg-black/20 p-2">
        <canvas ref={canvasRef} className="block" />
      </div>

      <div className="mt-2 text-[11px] text-white/60">
        shape: <span className="font-mono text-white/75">({m}, {n})</span> • scale:
        <span className="ml-1 font-mono text-white/75">±{mx.toFixed(0)}</span>
      </div>
    </div>
  );
}
