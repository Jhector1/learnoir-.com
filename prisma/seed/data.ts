// prisma/seed/data.ts

/**
 * Scalable topics:
 * - PracticeTopic is now a DB model, not an enum.
 * - In seed definitions, we refer to topics by stable slug strings.
 * - The seed script will create/find topics by slug and connect them.
 */





// prisma/seed/data.ts

export type TopicSlug = string;

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

/**
 * Topic catalog (optional but recommended):
 * keep all topic slugs in one place to avoid typos.
 *
 * Convention:
 *  - m0.*, m1.*, m2.* for module mapping
 *  - keep slugs stable forever
 *  - titleKey is for next-intl lookup (you’ll seed it into PracticeTopic.titleKey)
 */

export const TOPICS = {
  // Module 0
  m0_dot: "m0.dot",
  m0_vectors: "m0.vectors",
  m0_angle: "m0.angle",
  m0_projection: "m0.projection",
  m0_vectors_part1: "m0.vectors_part1",
  m0_vectors_part2: "m0.vectors_part2",

  // Module 1
  m1_linear_systems: "m1.linear_systems",
  m1_augmented: "m1.augmented",
  m1_rref: "m1.rref",
  m1_solution_types: "m1.solution_types",
  m1_parametric: "m1.parametric",

  // Module 2 (core engines)
  m2_matrix_ops: "m2.matrix_ops",
  m2_matrix_inverse: "m2.matrix_inverse",
  m2_matrix_properties: "m2.matrix_properties",

  // ✅ Module 2 — Matrices Part 1 (granular topics)
  m2_matrices_intro: "m2.matrices_intro",
  m2_index_slice: "m2.index_slice",
  m2_special: "m2.special",
  m2_elementwise_shift: "m2.elementwise_shift",
  m2_matmul: "m2.matmul",
  m2_matvec: "m2.matvec",
  m2_transpose_liveevil: "m2.transpose_liveevil",
  m2_symmetric: "m2.symmetric",

  // ✅ Optional “mix all part 1” topic (only keep if you want it)
  m2_matrices_part1_mix: "m2.matrices_part1",
} as const satisfies Record<string, TopicSlug>;

export type SeedSection = {
  moduleSlug: string;
  slug: string;
  order: number;
  title: string;
  description: string;
  topics: TopicSlug[];
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
    topics: [TOPICS.m0_dot, TOPICS.m0_vectors],
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
    topics: [TOPICS.m0_angle],
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
    topics: [TOPICS.m0_projection],
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
    topics: [TOPICS.m0_vectors_part1],
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
    topics: [TOPICS.m0_vectors_part2],
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
      TOPICS.m1_linear_systems,
      TOPICS.m1_augmented,
      TOPICS.m1_rref,
      TOPICS.m1_solution_types,
      TOPICS.m1_parametric,
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
 // ✅ Module 2 — Part 1 (NEW dedicated section)
  {
    moduleSlug: "module-2",
    slug: "module-2-matrices-part-1",
    order: 20,
    title: "Module 2 — Matrices (Part 1)",
    description: "Shapes, indexing, special matrices, matmul, transpose, symmetry.",
    topics: [
      TOPICS.m2_matrices_intro,
      TOPICS.m2_index_slice,
      TOPICS.m2_special,
      TOPICS.m2_elementwise_shift,
      TOPICS.m2_matmul,
      TOPICS.m2_matvec,
      TOPICS.m2_transpose_liveevil,
      TOPICS.m2_symmetric,

      // Optional: include the “mix” topic at the end (or omit)
      TOPICS.m2_matrices_part1_mix,
    ],
    meta: {
      module: 2,
      weeks: "Weeks 2–3",
      bullets: [
        "Matrix meaning + shape",
        "Indexing + slicing",
        "Special matrices",
        "Element-wise vs matmul",
        "Transpose + symmetry",
      ],
      skills: ["Read shapes", "Index/slice", "Multiply matrices", "Transpose rules"],
    },
  },

  // ✅ Module 2 — Core (keep your existing big topics)
  {
    moduleSlug: "module-2",
    slug: "module-2-matrices-core",
    order: 30,
    title: "Module 2 — Matrices (Core)",
    description: "Matrix ops, inverse, and key properties.",
    topics: [
      TOPICS.m2_matrix_ops,
      TOPICS.m2_matrix_inverse,
      TOPICS.m2_matrix_properties,
    ],
    meta: {
      module: 2,
      weeks: "Weeks 2–3",
      bullets: ["Operations", "Inverse", "Core properties"],
      skills: ["Compute products", "Use transpose rules", "Understand inverse"],
    },
  },
] as const;
