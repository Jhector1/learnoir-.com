// prisma/seed/data.ts
import { PracticeTopic } from "@prisma/client";

export const MODULES = [
  {
    slug: "module-0",
    order: 0,
    title: "Module 0 — Vector Foundations",
    description: "Dot product, angle, projection, and drag intuition.",
    weekStart: 0,
    weekEnd: 0,
  },
  {
    slug: "module-1",
    order: 10,
    title: "Module 1 — Linear Systems",
    description: "Systems, augmented matrices, elimination, RREF, solution types.",
    weekStart: 1,
    weekEnd: 2,
  },
  {
    slug: "module-2",
    order: 20,
    title: "Module 2 — Matrices",
    description: "Matrix operations, inverse, and core properties.",
    weekStart: 2,
    weekEnd: 3,
  },
] as const;

type SeedSection = {
  moduleSlug: string;
  slug: string;
  order: number;
  title: string;
  description: string;
  topics: PracticeTopic[]; // ✅ mutable
  meta: any;
};

export const SECTIONS: SeedSection[] = [
  // -------------------- Module 0 existing --------------------
  {
    moduleSlug: "module-0",
    slug: "module-0-dot",
    order: 0,
    title: "Module 0 — Dot Product",
    description: "Dot product intuition + computation + drag practice.",
    topics: [PracticeTopic.dot, PracticeTopic.vectors],
    meta: {
      module: 0,
      weeks: "Week 0",
      bullets: [
        "Dot product meaning (alignment)",
        "Compute dot products",
        "Sign / magnitude intuition",
        "Drag practice",
      ],
      skills: ["Compute dot products", "Interpret dot product geometrically"],
    },
  },
  {
    moduleSlug: "module-0",
    slug: "module-0-angle",
    order: 1,
    title: "Module 0 — Angle & Cosine",
    description: "Angle between vectors and cosine relationship.",
    topics: [PracticeTopic.angle],
    meta: {
      module: 0,
      weeks: "Week 0",
      bullets: ["Angle between vectors", "cos(θ) relationship"],
      skills: ["Compute/interpret angles between vectors"],
    },
  },
  {
    moduleSlug: "module-0",
    slug: "module-0-projection",
    order: 2,
    title: "Module 0 — Projection",
    description: "Projection basics.",
    topics: [PracticeTopic.projection],
    meta: {
      module: 0,
      weeks: "Week 0",
      bullets: ["Scalar projection", "Vector projection", "Perpendicular component"],
      skills: ["Project a onto b", "Decompose into parallel/perp components"],
    },
  },

  // -------------------- ✅ Add: Vectors Part 1 --------------------
  {
    moduleSlug: "module-0",
    slug: "module-0-vectors-part-1",
    order: 3,
    title: "Module 0 — Vectors (Part 1)",
    description:
      "Foundations: ℝⁿ, dimensionality, orientation, NumPy shapes, norms, dot product basics.",
    topics: [PracticeTopic.vectors_part1],
    meta: {
      module: 0,
      weeks: "Week 0",
      bullets: [
        "Vectors as ordered lists; notation like ℝⁿ",
        "Dimensionality vs orientation (row vs column)",
        "Transpose and why orientation matters",
        "NumPy shapes: (n,), (1,n), (n,1)",
        "Add/subtract and scalar multiplication (lists vs arrays gotcha)",
        "Magnitude (norm) and unit vectors",
        "Dot product computation + sign intuition",
      ],
      skills: [
        "Identify dimensionality & orientation",
        "Read/produce NumPy vector shapes",
        "Compute norm/unit vectors",
        "Compute and interpret dot products",
      ],
    },
  },

  // -------------------- ✅ Add: Vectors Part 2 --------------------
  {
    moduleSlug: "module-0",
    slug: "module-0-vectors-part-2",
    order: 4,
    title: "Module 0 — Vectors (Part 2)",
    description:
      "Linear combinations, independence, span/subspaces, basis, and coordinates in a basis.",
    topics: [PracticeTopic.vectors_part2],
    meta: {
      module: 0,
      weeks: "Week 0",
      bullets: [
        "Vector sets: finite vs infinite vs empty",
        "Linear weighted combinations (component-wise)",
        "Linear independence vs dependence (zero vector rule)",
        "Span and subspace intuition (line vs all of ℝ²)",
        "Subspace tests: contains 0 + closed under + and scalar mult",
        "Basis checks in ℝ² (det ≠ 0 intuition)",
        "Coordinates in a basis (solve for c₁, c₂)",
      ],
      skills: [
        "Classify sets (finite/infinite/empty)",
        "Compute linear combinations",
        "Decide independence/dependence",
        "Determine span dimension in ℝ²",
        "Apply subspace rules quickly",
        "Find coordinates in a basis",
      ],
    },
  },

  // -------------------- Module 1 existing --------------------
  {
    moduleSlug: "module-1",
    slug: "module-1-linear-systems",
    order: 10,
    title: "Module 1 — Linear Systems",
    description: "Solve systems using elimination and RREF.",
    topics: [
      PracticeTopic.linear_systems,
      PracticeTopic.augmented,
      PracticeTopic.rref,
      PracticeTopic.solution_types,
      PracticeTopic.parametric,
    ],
    meta: {
      module: 1,
      weeks: "Weeks 1–2",
      bullets: [
        "Linear equations and systems",
        "Augmented matrices",
        "Gaussian elimination + RREF",
        "Existence/uniqueness of solutions",
        "Parametric solutions and free variables",
      ],
      skills: [
        "Solve systems using elimination/RREF",
        "Classify solution types (unique / infinite / none)",
      ],
    },
  },

  // -------------------- Module 2 existing --------------------
  {
    moduleSlug: "module-2",
    slug: "module-2-matrices",
    order: 20,
    title: "Module 2 — Matrices",
    description: "Matrix rules, inverse, and operations.",
    topics: [
      PracticeTopic.matrix_ops,
      PracticeTopic.matrix_inverse,
      PracticeTopic.matrix_properties,
    ],
    meta: {
      module: 2,
      weeks: "Weeks 2–3",
      bullets: [
        "Matrix operations (add, multiply, transpose)",
        "Identity matrix, inverse (when it exists)",
        "Properties (associativity, distributivity, non-commutativity)",
      ],
      skills: ["Compute products/inverses (small sizes)", "Apply matrix rules correctly"],
    },
  },
] as const;
