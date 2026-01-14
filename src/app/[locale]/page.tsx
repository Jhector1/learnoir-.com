"use client";

import React, { useState } from "react";
import SpanBasisModule from "@/components/modules/SpanBasisModule";
import Module0VectorSimulatorP5Hybrid from "@/components/Module0VectorSimulatorP5Hybrid";
import type { Mode } from "@/lib/math/vec3";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Playground");

  const [tool, setTool] = useState<Tool>("module0");
  const [mode, setMode] = useState<Mode>("2d");

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold text-white">{t("title")}</div>
          <div className="text-sm text-white/60">{t("subtitle")}</div>
        </div>

        <div className="flex items-center gap-2">
          <TabButton active={tool === "span"} onClick={() => setTool("span")}>
            {t("tabs.spanBasis")}
          </TabButton>
          <TabButton active={tool === "module0"} onClick={() => setTool("module0")}>
            {t("tabs.module0")}
          </TabButton>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
        <div className="text-sm text-white/70">
          {t("viewMode")} <span className="text-white">{mode.toUpperCase()}</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <div className="flex">
            <SegButton active={mode === "2d"} onClick={() => setMode("2d")}>
              {t("mode.2d")}
            </SegButton>
            <SegButton active={mode === "3d"} onClick={() => setMode("3d")}>
              {t("mode.3d")}
            </SegButton>
          </div>
        </div>
      </div>

      {tool === "span" ? <SpanBasisModule mode={mode} /> : <Module0VectorSimulatorP5Hybrid mode={mode} />}
    </div>
  );
}
