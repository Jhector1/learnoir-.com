import React from "react";

import VectorBasicsSketch from "@/components/review/sketches/VectorBasicsSketch";
import DotProductSketch from "@/components/review/sketches/DotProductSketch";
import ProjectionSketch from "@/components/review/sketches/ProjectionSketch";
import IndependenceSketch from "@/components/review/sketches/IndependenceSketch";
import SpanSketch from "@/components/review/sketches/SpanSketch";
import BasisSketch from "@/components/review/sketches/BasisSketch";

import NumpyShapesSketch from "@/components/review/sketches/NumpyShapesSketch";
import HadamardOuterSketch from "@/components/review/sketches/HadamardOuterSketch";

const SKETCHES: Record<string, React.ComponentType<any>> = {
  "vec.basics": VectorBasicsSketch,
  "vec.dot": DotProductSketch,
  "vec.projection": ProjectionSketch,

  "vec.numpy": NumpyShapesSketch,
  "vec.products": HadamardOuterSketch,

  "vec.independence": IndependenceSketch,
  "vec.span": SpanSketch,
  "vec.basis": BasisSketch,
};

export default function SketchHost({
  sketchId,
  props,
  height,
}: {
  sketchId: string;
  props?: any;
  height: number;
}) {
  const Cmp = SKETCHES[sketchId];

  if (!Cmp) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60">
        Unknown sketch: <code className="text-white/80">{sketchId}</code>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hbidden"
    //   style={{ height }}
    >
      {/* Give sketches a consistent box to live in */}
      <div className="h-full w-full">
        {/* pass height for future sketches that want to use it */}
        <Cmp {...props} height={height} />
      </div>
    </div>
  );
}
