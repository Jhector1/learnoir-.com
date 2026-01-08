"use client";

import React, { useState } from "react";
import SpanBasisModule from "@/components/modules/SpanBasisModule";
import Module0VectorSimulatorP5Hybrid from "../components/Module0VectorSimulatorP5Hybrid";
import type { Mode } from "@/lib/math/vec3";

type Tool = "span" | "module0";

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-xl px-3 py-2 text-sm font-medium transition",
        "border border-white/10",
        active ? "bg-white/10 text-white" : "bg-black/20 text-white/70 hover:bg-white/5",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SegButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-1.5 text-sm transition",
        active ? "bg-white/15 text-white" : "bg-transparent text-white/70 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function Home() {
  const [tool, setTool] = useState<Tool>("module0");
  const [mode, setMode] = useState<Mode>("2d");

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold text-white">Linear Algebra Playground</div>
          <div className="text-sm text-white/60">
            Pick a tool, then switch between 2D/3D.
          </div>
        </div>

        {/* Tool tabs */}
        <div className="flex items-center gap-2">
          <TabButton active={tool === "span"} onClick={() => setTool("span")}>
            Span / Basis
          </TabButton>
          <TabButton active={tool === "module0"} onClick={() => setTool("module0")}>
            Dot / Projection (Module 0)
          </TabButton>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
        <div className="text-sm text-white/70">
          View mode: <span className="text-white">{mode.toUpperCase()}</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <div className="flex">
            <SegButton active={mode === "2d"} onClick={() => setMode("2d")}>
              2D
            </SegButton>
            <SegButton active={mode === "3d"} onClick={() => setMode("3d")}>
              3D
            </SegButton>
          </div>
        </div>
      </div>

      {/* Content */}
      {tool === "span" ? (
        <SpanBasisModule key={`span-${mode}`} mode={mode} />
      ) : (
        // If Module0VectorSimulatorP5Hybrid already has its own mode switch, keep it.
        // If it accepts a mode prop, pass it and remove its internal switch.
        <Module0VectorSimulatorP5Hybrid key={`m0-${mode}`}  />
      )}
    </div>
  );
}
