// src/lib/review/modules/matricesPart2Module.ts
import type { ReviewModule } from "@/lib/review/types";

export const matricesPart2Module: ReviewModule = {
  id: "matrices_part2",
  title: "Matrices — Part 2",
  subtitle:
    "Norms, trace, matrix spaces, rank, determinant, characteristic polynomial",
  startPracticeHref: (topicId) =>
    `/practice?section=module-2-matrices&difficulty=easy&topic=${encodeURIComponent(
      topicId
    )}`,
  topics: [
    // ------------------------------------------------------------
    // TOPIC 1 — NORMS + TRACE + DISTANCE
    // ------------------------------------------------------------
    {
      id: "mat2_norms",
      label: "Matrix norms: Frobenius + trace trick + distance",
      minutes: 14,
      summary:
        "Frobenius norm summarizes matrix “energy.” Compute directly or via tr(AᵀA), and use it as a distance between matrices.",
      cards: [
        {
          type: "text",
          id: "mat2_norms_t1",
          title: "Frobenius norm",
          markdown: String.raw`
The **Frobenius norm** is the “vector length” of a matrix (treat all entries as one long vector):

$$
\|\mathbf{A}\|_F=\sqrt{\sum_{i=1}^{m}\sum_{j=1}^{n} a_{i,j}^2}
$$

It increases when:
- entries get larger in magnitude
- more entries are nonzero
`.trim(),
        },
        {
          type: "text",
          id: "mat2_norms_t2",
          title: "Trace trick + matrix distance",
          markdown: String.raw`
A key identity:

$$
\|\mathbf{A}\|_F^2 = \mathrm{tr}(\mathbf{A}^T\mathbf{A})
\quad\Rightarrow\quad
\|\mathbf{A}\|_F = \sqrt{\mathrm{tr}(\mathbf{A}^T\mathbf{A})}
$$

A **matrix distance**:

$$
d(\mathbf{A},\mathbf{B})=\|\mathbf{A}-\mathbf{B}\|_F
$$
`.trim(),
        },
        {
          type: "sketch",
          id: "mat2_norms_s1",
          title: "Edit A and B, watch norms + distance update",
          sketchId: "mat2.norms",
          height: 420,
        },
        {
          type: "quiz",
          id: "mat2_norms_q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "mat2_norms_q1a",
              prompt: String.raw`Which expression equals $\|\mathbf{A}\|_F^2$?`,
              choices: [
                { id: "a", label: String.raw`$\mathrm{tr}(\mathbf{A})$` },
                { id: "b", label: String.raw`$\mathrm{tr}(\mathbf{A}^T\mathbf{A})$` },
                { id: "c", label: String.raw`$\det(\mathbf{A})$` },
              ],
              answerId: "b",
              explain: String.raw`$\|\mathbf{A}\|_F^2=\mathrm{tr}(\mathbf{A}^T\mathbf{A})$.`,
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 2 — COLUMN SPACE (rank test) + AUGMENTED “PROOF” INTUITION
    // ------------------------------------------------------------
    {
      id: "mat2_colspace",
      label: "Column space: is b in Col(A)? + augmented rank intuition",
      minutes: 18,
      summary:
        "b is in Col(A) iff Ax=b is consistent. Augmenting with b and comparing ranks gives a fast test; residual shows how far b is from the span.",
      cards: [
        {
          type: "text",
          id: "mat2_colspace_t1",
          title: "Column space meaning",
          markdown: String.raw`
The **column space** of $\mathbf{A}$ is all vectors you can make as a linear combination of columns:

$$
\mathrm{Col}(\mathbf{A})=\{\,\mathbf{A}\mathbf{x}\;:\;\mathbf{x}\in\mathbb{R}^n\,\}
$$

So:

$$
\mathbf{b}\in\mathrm{Col}(\mathbf{A})
\iff
\exists\,\mathbf{x}\;\text{s.t.}\;\mathbf{A}\mathbf{x}=\mathbf{b}.
$$
`.trim(),
        },
        {
          type: "text",
          id: "mat2_colspace_t2",
          title: "Rank test (fast consistency check)",
          markdown: String.raw`
Compare ranks:

$$
\mathbf{b}\in\mathrm{Col}(\mathbf{A})
\iff
\mathrm{rank}(\mathbf{A})=\mathrm{rank}([\mathbf{A}\mid \mathbf{b}]).
$$

- If the rank **doesn’t change**, $\mathbf{b}$ is **redundant** (already in the span).
- If the rank **increases**, $\mathbf{b}$ adds a **new direction** (not in the span).
`.trim(),
        },
        {
          type: "sketch",
          id: "mat2_colspace_s1",
          title: "Drag b and watch rank(A) vs rank([A|b])",
          sketchId: "mat2.colspace",
          height: 460,
        },
        {
          type: "sketch",
          id: "mat2_colspace_s2",
          title: "Augmented-matrix intuition: show best-fit Ax and residual",
          sketchId: "mat2.augment",
          height: 520,
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 3 — ROW SPACE (separate sketch)
    // ------------------------------------------------------------
    {
      id: "mat2_rowspace",
      label: "Row space: span of rows (Row(A) = Col(Aᵀ))",
      minutes: 14,
      summary:
        "Row space is the span of the rows. Because transpose swaps rows/cols, Row(A) = Col(Aᵀ).",
      cards: [
        {
          type: "text",
          id: "mat2_rowspace_t1",
          title: "Definition",
          markdown: String.raw`
The **row space** is all linear combinations of the rows:

$$
\mathrm{Row}(\mathbf{A})=\{\,\mathbf{z}^T\mathbf{A}\;:\;\mathbf{z}\in\mathbb{R}^m\,\}
$$

Key identity (transpose swaps rows/cols):

$$
\mathrm{Row}(\mathbf{A})=\mathrm{Col}(\mathbf{A}^T).
$$
`.trim(),
        },
        {
          type: "sketch",
          id: "mat2_rowspace_s1",
          title: "Drag r and test r ∈ Row(A) using rank on Aᵀ",
          sketchId: "mat2.rowspace",
          height: 460,
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 4 — NULL SPACE + LEFT NULL SPACE (4 subspaces idea)
    // ------------------------------------------------------------
    {
      id: "mat2_nullspaces",
      label: "Null space + left-null space: inputs that map to zero",
      minutes: 18,
      summary:
        "Null(A) solves Ay=0. LeftNull(A)=Null(Aᵀ) solves Aᵀw=0 (vectors orthogonal to Col(A)).",
      cards: [
        {
          type: "text",
          id: "mat2_nullspaces_t1",
          title: "Null space",
          markdown: String.raw`
The **null space** is:

$$
\mathcal{N}(\mathbf{A})=\{\mathbf{y}:\mathbf{A}\mathbf{y}=\mathbf{0}\}.
$$

A nonzero $\mathbf{y}$ with $\mathbf{A}\mathbf{y}=\mathbf{0}$ means $\mathbf{A}$ **collapses** some direction.
`.trim(),
        },
        {
          type: "text",
          id: "mat2_nullspaces_t2",
          title: "Left null space",
          markdown: String.raw`
The **left null space** is the null space of the transpose:

$$
\mathcal{N}(\mathbf{A}^T)=\{\mathbf{w}:\mathbf{A}^T\mathbf{w}=\mathbf{0}\}.
$$

Geometric meaning:
- $\mathbf{w}\in\mathcal{N}(\mathbf{A}^T)$ is **orthogonal to every column** of $\mathbf{A}$.
- So it’s orthogonal to $\mathrm{Col}(\mathbf{A})$.
`.trim(),
        },
        {
          type: "sketch",
          id: "mat2_nullspaces_s1",
          title: "Null space: drag y and make Ay ≈ 0",
          sketchId: "mat2.nullspace",
          height: 460,
        },
        {
          type: "sketch",
          id: "mat2_nullspaces_s2",
          title: "Left null space: drag w and make Aᵀw ≈ 0",
          sketchId: "mat2.leftnull",
          height: 460,
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 5 — RANK + LINEAR INDEPENDENCE
    // ------------------------------------------------------------
    {
      id: "mat2_rank_independence",
      label: "Rank + linear independence (rank = dim Col(A))",
      minutes: 18,
      summary:
        "Rank counts independent directions. A set of vectors is independent iff the matrix with those vectors as columns has full column rank.",
      cards: [
        {
          type: "text",
          id: "mat2_rank_independence_t1",
          title: "Rank connects the spaces",
          markdown: String.raw`
Rank is the dimension of the column space:

$$
\mathrm{rank}(\mathbf{A})=\dim(\mathrm{Col}(\mathbf{A}))
=\dim(\mathrm{Row}(\mathbf{A})).
$$

For a $2\times2$:
- rank 2 → spans the whole plane
- rank 1 → spans a line
- rank 0 → only the origin
`.trim(),
        },
        {
          type: "text",
          id: "mat2_rank_independence_t2",
          title: "Independence test via rank",
          markdown: String.raw`
Put vectors as columns into a matrix $\mathbf{V}=[\mathbf{v}_1\ \mathbf{v}_2\ \cdots]$.

Then:
- independent  $\iff \mathrm{rank}(\mathbf{V})=$ (# columns)
- dependent    $\iff \mathrm{rank}(\mathbf{V})<$ (# columns)
`.trim(),
        },
        {
          type: "sketch",
          id: "mat2_rank_independence_s1",
          title: "Drag vectors; watch rank and (for 2D) det/area",
          sketchId: "mat2.independence",
          height: 520,
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 6 — RANK IN PRACTICE: NOISE + TOLERANCE + SHIFTING
    // ------------------------------------------------------------
    {
      id: "mat2_rank_practice",
      label: "Rank in practice: tolerance + shifting A+αI",
      minutes: 18,
      summary:
        "Tiny noise can flip computed rank. Shifting by αI often restores full rank (critical for invertibility).",
      cards: [
        {
          type: "sketch",
          id: "mat2_rank_practice_s1",
          title: "Add noise + change tolerance, watch effective rank flip",
          sketchId: "mat2.rank",
          height: 420,
        },
        {
          type: "sketch",
          id: "mat2_rank_practice_s2",
          title: "Shift by αI: watch det and rank change instantly",
          sketchId: "mat2.shift",
          height: 460,
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 7 — SPECIAL CASES + RANK BOUNDS: OUTER PRODUCT, A+B, AB
    // ------------------------------------------------------------
    {
      id: "mat2_rank_ops",
      label: "Rank tools: outer product (rank-1) + bounds for A+B and AB",
      minutes: 18,
      summary:
        "Outer product builds rank-1 matrices. Rank(A+B) and Rank(AB) have useful upper bounds (but aren’t determined exactly).",
      cards: [
        {
          type: "sketch",
          id: "mat2_rank_ops_s1",
          title: "Outer product u vᵀ always produces rank 1 (unless zero)",
          sketchId: "mat2.outer",
          height: 520,
        },
        {
          type: "sketch",
          id: "mat2_rank_ops_s2",
          title: "Play with A and B; see rank(A+B), rank(AB) and bounds",
          sketchId: "mat2.rankops",
          height: 520,
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 8 — DETERMINANT
    // ------------------------------------------------------------
    {
      id: "mat2_det",
      label: "Determinant: area scaling + singular collapse",
      minutes: 14,
      summary:
        "In 2D, det(A) is the signed area scale factor. det(A)=0 means collapse to a line/point.",
      cards: [
        {
          type: "text",
          id: "mat2_det_t1",
          title: "Area + orientation",
          markdown: String.raw`
For a $2\times2$ matrix, $\det(\mathbf{A})$ measures **signed area scaling**:

- $|\det(\mathbf{A})|$ = how much areas scale
- sign tells whether orientation flips (reflection)

If $\mathbf{A}$ maps the unit square to a parallelogram, then:

$$
\text{Area(parallelogram)} = |\det(\mathbf{A})|.
$$
`.trim(),
        },
        {
          type: "sketch",
          id: "mat2_det_s1",
          title: "Unit square image: det controls area + flip",
          sketchId: "mat2.det",
          height: 460,
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 9 — CHARACTERISTIC POLYNOMIAL
    // ------------------------------------------------------------
    {
      id: "mat2_charpoly",
      label: "Characteristic polynomial: det(A−λI)=0 → eigenvalues",
      minutes: 16,
      summary:
        "Eigenvalues are λ where A−λI becomes singular, i.e., det(A−λI)=0.",
      cards: [
        {
          type: "text",
          id: "mat2_charpoly_t1",
          title: "Eigenvalue condition",
          markdown: String.raw`
An eigenvalue $\lambda$ satisfies:

$$
\mathbf{A}\mathbf{v}=\lambda \mathbf{v}
\quad (\mathbf{v}\neq\mathbf{0})
$$

Rearrange:

$$
(\mathbf{A}-\lambda \mathbf{I})\mathbf{v}=\mathbf{0}
$$

So eigenvalues happen exactly when $(\mathbf{A}-\lambda\mathbf{I})$ has a nontrivial nullspace.
`.trim(),
        },
        {
          type: "sketch",
          id: "mat2_charpoly_s1",
          title: "Slide λ, watch det(A−λI), and compare Av vs λv",
          sketchId: "mat2.charpoly",
          height: 520,
        },
      ],
    },
  ],
};
