import React from "react";

import VectorBasicsSketch from "@/components/review/sketches/vectorpart1/VectorBasicsSketch";
import DotProductSketch from "@/components/review/sketches/vectorpart1/DotProductSketch";
import ProjectionSketch from "@/components/review/sketches/vectorpart1/ProjectionSketch";
import IndependenceSketch from "@/components/review/sketches/vectorpart2/IndependenceSketch";
import SpanSketch from "@/components/review/sketches/vectorpart2/SpanSketch";
import BasisSketch from "@/components/review/sketches/vectorpart2/BasisSketch";

import NumpyShapesSketch from "@/components/review/sketches/vectorpart1/NumpyShapesSketch";
import HadamardOuterSketch from "@/components/review/sketches/vectorpart1/HadamardOuterSketch";
import MatrixAsImageSketch from "./sketches/matrices/MatrixAsImageSketch";
import MatrixSliceSketch from "./sketches/matrices/MatrixSliceSketch";
import SpecialMatricesSketch from "./sketches/matrices/SpecialMatricesSketch";
import HadamardShiftSketch from "./sketches/matrices/HadamardShiftSketch";
import MatMulExplorerSketch from "./sketches/matrices/MatMulExplorerSketch";
import LiveEvilSketch from "./sketches/matrices/LiveEvilSketch";
import SymmetricBuilderSketch from "./sketches/matrices/SymmetricBuilderSketch";
import Transform2DSketch from "./sketches/matrices/Transform2DSketch";
import MatrixNormsSketch from "./sketches/matricespart2/MatrixNormsSketch";
import ColumnSpaceSketch from "./sketches/matricespart2/ColumnSpaceSketch";
import NullSpaceSketch from "./sketches/matricespart2/NullSpaceSketch";
import RankToleranceSketch from "./sketches/matricespart2/RankToleranceSketch";
import DeterminantSketch from "./sketches/matricespart2/DeterminantSketch";
import CharacteristicPolynomialSketch from "./sketches/matricespart2/CharacteristicPolynomialSketch";
import Mat2RowSpaceSketch from "./sketches/matricespart2/Mat2RowSpaceSketch";
import Mat2LeftNullspaceSketch from "./sketches/matricespart2/Mat2LeftNullspaceSketch";
import AugmentedRankProofSketch from "./sketches/matricespart2/AugmentedRankProofSketch";
import LinearIndependenceRankSketch from "./sketches/matricespart2/LinearIndependenceRankSketch";
import Mat2IndependenceSketch from "./sketches/matricespart2/Mat2IndependenceSketch";
import Mat2ShiftRankSketch from "./sketches/matricespart2/Mat2ShiftRankSketch";
import Mat2AugmentedRankSketch from "./sketches/matricespart2/Mat2AugmentedRankSketch";
import Mat2RankOpsSketch from "./sketches/matricespart2/Mat2RankOpsSketch";
import Mat2OuterProductSketch from "./sketches/matricespart2/Mat2OuterProductSketch";

const SKETCHES: Record<string, React.ComponentType<any>> = {
  "vec.basics": VectorBasicsSketch,
  "vec.dot": DotProductSketch,
  "vec.projection": ProjectionSketch,

  "vec.numpy": NumpyShapesSketch,
  "vec.products": HadamardOuterSketch,

  "vec.independence": IndependenceSketch,
  "vec.span": SpanSketch,
  "vec.basis": BasisSketch,
  "matrices.image": MatrixAsImageSketch,
  "matrices.slice": MatrixSliceSketch,
  "matrices.special": SpecialMatricesSketch,
  "matrices.hadamard_shift": HadamardShiftSketch,
  "matrices.matmul": MatMulExplorerSketch,
  "matrices.transform2d": Transform2DSketch,
  "matrices.liveevil": LiveEvilSketch,
  "matrices.symmetric": SymmetricBuilderSketch,
  "mat2.norms": MatrixNormsSketch,
  // "mat2.colspace": ColumnSpaceSketch,
  "mat2.nullspace": NullSpaceSketch,
  "mat2.rank": RankToleranceSketch,
  "mat2.det": DeterminantSketch,
  "mat2.charpoly": CharacteristicPolynomialSketch,
  // ✅ fix your errors:
  "mat2.independence": Mat2IndependenceSketch,
  "mat2.shift": Mat2ShiftRankSketch,
  "mat2.augment": Mat2AugmentedRankSketch,
  // "mat2.outer": HadamardOuterSketch,
"mat2.rankops": Mat2RankOpsSketch,
"mat2.outer": Mat2OuterProductSketch,
  


  
  "mat2.rowspace": Mat2RowSpaceSketch,

  "mat2.leftnull": Mat2LeftNullspaceSketch,

  "mat2.rankTol": RankToleranceSketch,
  "mat2.augRank": AugmentedRankProofSketch,

  "mat2.linind": LinearIndependenceRankSketch,
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
