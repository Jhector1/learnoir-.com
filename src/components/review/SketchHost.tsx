import React from "react";
import VectorBasicsSketch from "@/components/review/sketches/VectorBasicsSketch";
import DotProductSketch from "@/components/review/sketches/DotProductSketch";
import ProjectionSketch from "@/components/review/sketches/ProjectionSketch";
import IndependenceSketch from "@/components/review/sketches/IndependenceSketch";
import SpanSketch from "@/components/review/sketches/SpanSketch";
import BasisSketch from "@/components/review/sketches/BasisSketch";
const SKETCHES: Record<string, React.ComponentType<any>> = {
  "vec.basics": VectorBasicsSketch,
  "vec.dot": DotProductSketch,
  "vec.projection": ProjectionSketch,
    "vec.independence": IndependenceSketch,
  "vec.span": SpanSketch,
  "vec.basis": BasisSketch,
};

export default function SketchHost({ sketchId, props, height }: { sketchId: string; props?: any; height: number }) {
  const Cmp = SKETCHES[sketchId];
  if (!Cmp) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60">
        Unknown sketch: <code className="text-white/80">{sketchId}</code>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidmden">
      <Cmp {...props} />
    </div>
  );
}
