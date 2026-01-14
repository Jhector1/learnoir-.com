import type { ReviewModule } from "@/lib/review/types";

export const matricesPart1Module: ReviewModule = {
  id: "matrices_part1",
  title: "Matrices — Part 1",
  subtitle:
    "From data tables to transformations: indexing, special matrices, multiplication, transpose, symmetry",
  startPracticeHref: (topicId) =>
    `/practice?section=module-2-matrices&difficulty=easy&topic=${encodeURIComponent(
      topicId
    )}`,
  topics: [
    // ------------------------------------------------------------
    // TOPIC 1 — WHAT IS A MATRIX?
    // ------------------------------------------------------------
    {
      id: "matrices_intro",
      label: "Matrices: meaning, shape, and why they matter",
      minutes: 12,
      summary:
        "A matrix is a grid of numbers used for data tables, systems of equations, images, and geometric transforms.",
      cards: [
        {
          type: "text",
          id: "m1_t1",
          title: "A matrix is a structured grid",
          markdown: String.raw`
A **matrix** is a **rectangular array** of numbers:

$$
\mathbf{A}=
\begin{bmatrix}
a_{1,1} & a_{1,2} & \cdots & a_{1,n}\\
a_{2,1} & a_{2,2} & \cdots & a_{2,n}\\
\vdots  & \vdots  & \ddots & \vdots\\
a_{m,1} & a_{m,2} & \cdots & a_{m,n}
\end{bmatrix}
\in \mathbb{R}^{m\times n}
$$

- **Shape** is written \((\text{rows},\ \text{cols})\).
- We write matrices in **bold capital letters**: \(\mathbf{A},\mathbf{M}\).
`.trim(),
        },
        {
          type: "text",
          id: "m1_t2",
          title: "Three useful mental models",
          markdown: String.raw`
A matrix can be viewed as:

1) **Columns view:** a stack of column vectors side-by-side (features).  
2) **Rows view:** a stack of row vectors on top of each other (channels / time series).  
3) **Cells view:** individual values (like an image: each element = pixel intensity).

In data science, matrices are often called **data tables**:
- rows = observations (customers)
- columns = features (purchases)
`.trim(),
        },
        {
          type: "sketch",
          id: "m1_s1",
          title: "Matrix as an image (value → color)",
          sketchId: "matrices.image",
          height: 420,
        },
        {
          type: "quiz",
          id: "m1_q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "m1_q1a",
              prompt: String.raw`If \(\mathbf{A}\in\mathbb{R}^{3\times 5}\), how many rows and columns does \(\mathbf{A}\) have?`,
              choices: [
                { id: "a", label: "3 rows, 5 columns" },
                { id: "b", label: "5 rows, 3 columns" },
                { id: "c", label: "8 total rows/cols" },
              ],
              answerId: "a",
              explain: String.raw`The notation \(3\times5\) means rows × columns.`,
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 2 — INDEXING + SLICING
    // ------------------------------------------------------------
    {
      id: "index_slice",
      label: "Indexing + slicing (submatrices)",
      minutes: 14,
      summary:
        "Math is 1-based indexing; NumPy is 0-based. Slicing extracts blocks of rows/columns.",
      cards: [
        {
          type: "text",
          id: "m2_t1",
          title: "Indexing: math vs Python",
          markdown: String.raw`
In math, \(a_{3,4}\) means: **3rd row, 4th column**.

In NumPy (0-based):
- \(a_{3,4}\) is **A[2, 3]**

> Math: 1,2,3,...  
> Python: 0,1,2,...
`.trim(),
        },
        {
          type: "text",
          id: "m2_t2",
          title: "Slicing = extracting a submatrix",
          markdown: String.raw`
Slicing picks a **range of rows** and **range of columns**:

~~~python
import numpy as np

A = np.arange(60).reshape(6,10)
sub = A[1:4, 0:5]   # rows 1..3, cols 0..4
~~~

- \(\texttt{1:4}\) means: start at 1, stop before 4.
- \(\texttt{0:5}\) means: start at 0, stop before 5.
`.trim(),
        },
        {
          type: "sketch",
          id: "m2_s1",
          title: "Drag a rectangle to slice a matrix",
          sketchId: "matrices.slice",
          height: 440,
        },
        {
          type: "quiz",
          id: "m2_q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "m2_q1a",
              prompt: String.raw`In NumPy, which index selects the element \(a_{3,4}\) (3rd row, 4th col) from matrix A?`,
              choices: [
                { id: "a", label: "A[3,4]" },
                { id: "b", label: "A[2,3]" },
                { id: "c", label: "A[4,3]" },
              ],
              answerId: "b",
              explain: String.raw`Subtract 1 from each coordinate because NumPy is 0-based.`,
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 3 — SPECIAL MATRICES
    // ------------------------------------------------------------
    {
      id: "special",
      label: "Special matrices (identity, diagonal, triangular, zeros)",
      minutes: 16,
      summary:
        "Common matrix “families” have patterns and dedicated NumPy constructors.",
      cards: [
        {
          type: "text",
          id: "m3_t1",
          title: "Common special matrices",
          markdown: String.raw`
### Identity \(I\)
Diagonal of 1s, else 0s. Acts like “1” for matrices.

### Diagonal
Only diagonal elements may be nonzero.

### Triangular
All zeros above or below the diagonal:
- upper: zeros below
- lower: zeros above

### Zeros
All entries are 0.

### Random
Useful for experiments and demos.
`.trim(),
        },
        {
          type: "text",
          id: "m3_t2",
          title: "NumPy constructors",
          markdown: String.raw`
~~~python
import numpy as np

I = np.eye(4)              # 4x4 identity
Z = np.zeros((3,5))        # 3x5 zeros
D = np.diag([2,4,6])       # diagonal from a vector

A = np.random.randn(4,6)   # random Gaussian matrix
U = np.triu(A)             # upper triangular (keep above diagonal)
L = np.tril(A)             # lower triangular (keep below diagonal)
~~~

**Tip:** always check \(\texttt{A.shape}\) while learning.
`.trim(),
        },
        {
          type: "sketch",
          id: "m3_s1",
          title: "Special matrix gallery (click + visualize)",
          sketchId: "matrices.special",
          height: 420,
        },
        {
          type: "quiz",
          id: "m3_q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "m3_q1a",
              prompt: String.raw`Which matrix has 1s on the diagonal and 0s elsewhere?`,
              choices: [
                { id: "a", label: "Diagonal matrix" },
                { id: "b", label: "Identity matrix" },
                { id: "c", label: "Upper triangular matrix" },
              ],
              answerId: "b",
              explain: String.raw`The identity is a diagonal matrix with all diagonal entries equal to 1.`,
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 4 — ELEMENT-WISE OPS + SHIFTING
    // ------------------------------------------------------------
    {
      id: "elementwise_shift",
      label: "Element-wise math + shifting a matrix",
      minutes: 18,
      summary:
        "Addition, scalar multiply, Hadamard multiply are element-wise. Shifting adds to the diagonal only.",
      cards: [
        {
          type: "text",
          id: "m4_t1",
          title: "Element-wise operations",
          markdown: String.raw`
### Matrix addition / subtraction
Defined only when shapes match:
$$
(\mathbf{A}+\mathbf{B})_{i,j} = a_{i,j}+b_{i,j}
$$

### Scalar-matrix multiplication
Multiply every entry by a scalar \(\gamma\):
$$
(\gamma\mathbf{A})_{i,j}=\gamma a_{i,j}
$$

### Hadamard multiplication
Element-wise multiply (same shape required):
$$
(\mathbf{A}\odot\mathbf{B})_{i,j}=a_{i,j}b_{i,j}
$$
`.trim(),
        },
        {
          type: "text",
          id: "m4_t2",
          title: "Python symbols: * vs @ (important!)",
          markdown: String.raw`
~~~python
import numpy as np

A = np.random.randn(3,4)
B = np.random.randn(3,4)

A * B      # Hadamard (element-wise)
# A @ B    # matrix multiplication (INVALID here because shapes don't match)
~~~

- \(\texttt{*}\) = element-wise (Hadamard)  
- \(\texttt{@}\) = standard matrix multiplication  
`.trim(),
        },
        {
          type: "text",
          id: "m4_t3",
          title: "Shifting a matrix (the diagonal-only way)",
          markdown: String.raw`
Adding a scalar to a matrix is not a “pure” linear algebra operation, but **shifting** is:

$$
\mathbf{A}+\lambda \mathbf{I}
$$

Only diagonal elements change.

~~~python
import numpy as np

A = np.array([[4,5,1],
              [0,1,11],
              [4,9,7]])
lam = 6

A + lam                # broadcasts (adds to every entry) — not shifting
A + lam*np.eye(len(A)) # shifting (adds only to diagonal)
~~~
`.trim(),
        },
        {
          type: "sketch",
          id: "m4_s1",
          title: "Hadamard vs shifting (see what changes)",
          sketchId: "matrices.hadamard_shift",
          height: 420,
        },
        {
          type: "quiz",
          id: "m4_q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "m4_q1a",
              prompt: String.raw`Which operation changes only the diagonal entries of \(\mathbf{A}\)?`,
              choices: [
                { id: "a", label: String.raw`\(\mathbf{A} + \lambda\)` },
                { id: "b", label: String.raw`\(\mathbf{A} + \lambda\mathbf{I}\)` },
                { id: "c", label: String.raw`\(\lambda\mathbf{A}\)` },
              ],
              answerId: "b",
              explain: String.raw`Shifting is \(\mathbf{A}+\lambda\mathbf{I}\), which modifies only the diagonal.`,
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 5 — STANDARD MATRIX MULTIPLICATION
    // ------------------------------------------------------------
    {
      id: "matmul",
      label: "Standard matrix multiplication (row·column dot products)",
      minutes: 20,
      summary:
        "Validity is inner dimensions matching. Each output cell is a dot product of a row and a column.",
      cards: [
        {
          type: "text",
          id: "m5_t1",
          title: "Validity rule: inner dimensions must match",
          markdown: String.raw`
If \(\mathbf{A}\) is \(m\times n\) and \(\mathbf{B}\) is \(n\times k\), then:

$$
(m\times n)(n\times k) = (m\times k)
$$

- **Valid only when** the “inner” dimensions match.
- The result shape comes from the “outer” dimensions.
`.trim(),
        },
        {
          type: "text",
          id: "m5_t2",
          title: "How the numbers are computed",
          markdown: String.raw`
Each entry \((i,j)\) in \(\mathbf{C}=\mathbf{A}\mathbf{B}\) is:

$$
c_{i,j} = \text{(row i of A)} \cdot \text{(col j of B)}
$$

So matrix multiplication is a **systematic collection of dot products**.
`.trim(),
        },
        {
          type: "sketch",
          id: "m5_s1",
          title: "Click a row + a column → watch the dot product fill a cell",
          sketchId: "matrices.matmul",
          height: 460,
        },
        {
          type: "quiz",
          id: "m5_q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "m5_q1a",
              prompt: String.raw`If \(\mathbf{A}\) is \(2\times 3\) and \(\mathbf{B}\) is \(3\times 4\), what is the shape of \(\mathbf{A}\mathbf{B}\)?`,
              choices: [
                { id: "a", label: "2×4" },
                { id: "b", label: "3×3" },
                { id: "c", label: "4×2" },
              ],
              answerId: "a",
              explain: String.raw`Inner 3 matches 3, result takes outer dimensions 2 and 4 → 2×4.`,
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 6 — MATRIX-VECTOR MULTIPLICATION (WEIGHTS + TRANSFORMS)
    // ------------------------------------------------------------
    {
      id: "matvec",
      label: "Matrix–vector multiplication: weighted sums + transforms",
      minutes: 18,
      summary:
        "A matrix times a vector can mean a weighted combination of columns or a geometric transform in 2D/3D.",
      cards: [
        {
          type: "text",
          id: "m6_t1",
          title: "Weighted combinations (columns-as-vectors)",
          markdown: String.raw`
Put vectors as columns of \(\mathbf{A}\) and weights in \(\mathbf{w}\):

$$
\mathbf{A}\mathbf{w} =
w_1\mathbf{a}_1 + w_2\mathbf{a}_2 + \cdots + w_n\mathbf{a}_n
$$

Interpretation:
- each weight scales a column
- then scaled columns add up
`.trim(),
        },
        {
          type: "text",
          id: "m6_t2",
          title: "Geometric transform (2×2 acting on a 2D vector)",
          markdown: String.raw`
A \(2\times2\) matrix can rotate/stretch/shear a 2D vector:

$$
\mathbf{M}\mathbf{x}
$$

Sometimes, a vector keeps its direction and only scales — that’s the “eigenvector” preview.
`.trim(),
        },
        {
          type: "sketch",
          id: "m6_s1",
          title: "2D transform pad (drag v, edit the 2×2 matrix, see Mv)",
          sketchId: "matrices.transform2d",
          height: 460,
        },
        {
          type: "quiz",
          id: "m6_q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "m6_q1a",
              prompt: String.raw`Which interpretation matches \(\mathbf{A}\mathbf{w}\) when columns of \(\mathbf{A}\) are vectors?`,
              choices: [
                { id: "a", label: "Dot products of rows and rows" },
                { id: "b", label: "Weighted sum of columns" },
                { id: "c", label: "Element-wise multiplication" },
              ],
              answerId: "b",
              explain: String.raw`\(\mathbf{A}\mathbf{w}\) forms a linear combination of the columns of \(\mathbf{A}\).`,
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 7 — TRANSPOSE + LIVE EVIL
    // ------------------------------------------------------------
    {
      id: "transpose_liveevil",
      label: "Transpose + LIVE EVIL (order flips!)",
      minutes: 14,
      summary:
        "Transpose swaps rows/cols. For products: transpose each factor and reverse order.",
      cards: [
        {
          type: "text",
          id: "m7_t1",
          title: "Transpose basics",
          markdown: String.raw`
Transpose swaps rows and columns:

$$
(\mathbf{A}^T)_{i,j} = a_{j,i}
$$

And double transpose returns the original:
$$
(\mathbf{A}^T)^T=\mathbf{A}
$$
`.trim(),
        },
        {
          type: "text",
          id: "m7_t2",
          title: "LIVE EVIL rule (product transpose)",
          markdown: String.raw`
For a product of matrices, transpose reverses order:

$$
(\mathbf{A}\mathbf{B}\mathbf{C})^T = \mathbf{C}^T\mathbf{B}^T\mathbf{A}^T
$$

Mnemonic: **LIVE EVIL**  
\[
(LIVE)^T = E^T V^T I^T L^T
\]
`.trim(),
        },
        {
          type: "sketch",
          id: "m7_s1",
          title: "LIVE EVIL checker (random matrices verify equality ✅)",
          sketchId: "matrices.liveevil",
          height: 420,
        },
        {
          type: "quiz",
          id: "m7_q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "m7_q1a",
              prompt: String.raw`Which is correct?`,
              choices: [
                { id: "a", label: String.raw`\((AB)^T = A^T B^T\)` },
                { id: "b", label: String.raw`\((AB)^T = B^T A^T\)` },
                { id: "c", label: String.raw`\((AB)^T = (AB)\)` },
              ],
              answerId: "b",
              explain: String.raw`Transpose of a product reverses order: \((AB)^T=B^T A^T\).`,
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 8 — SYMMETRIC MATRICES + BUILDING AᵀA
    // ------------------------------------------------------------
    {
      id: "symmetric",
      label: "Symmetric matrices + building AᵀA and AAᵀ",
      minutes: 16,
      summary:
        "Symmetry means A = Aᵀ (must be square). Any matrix can generate a symmetric matrix via AᵀA or AAᵀ.",
      cards: [
        {
          type: "text",
          id: "m8_t1",
          title: "Symmetric means mirrored across the diagonal",
          markdown: String.raw`
A matrix is **symmetric** if:

$$
\mathbf{A} = \mathbf{A}^T
$$

That implies:
- \(\mathbf{A}\) must be **square**
- entry-wise: \(a_{i,j} = a_{j,i}\)
`.trim(),
        },
        {
          type: "text",
          id: "m8_t2",
          title: "Make symmetry from any matrix",
          markdown: String.raw`
If \(\mathbf{A}\) is \(m\times n\), then:

- \(\mathbf{A}^T\mathbf{A}\) is \(n\times n\) and symmetric
- \(\mathbf{A}\mathbf{A}^T\) is \(m\times m\) and symmetric

Proof idea uses LIVE EVIL:
$$
(\mathbf{A}^T\mathbf{A})^T = \mathbf{A}^T(\mathbf{A}^T)^T = \mathbf{A}^T\mathbf{A}
$$
`.trim(),
        },
        {
          type: "sketch",
          id: "m8_s1",
          title: "Build AᵀA and AAᵀ (see symmetry + shapes)",
          sketchId: "matrices.symmetric",
          height: 440,
        },
        {
          type: "quiz",
          id: "m8_q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "m8_q1a",
              prompt: String.raw`If \(\mathbf{A}\) is \(4\times 2\), what is the shape of \(\mathbf{A}^T\mathbf{A}\)?`,
              choices: [
                { id: "a", label: "4×4" },
                { id: "b", label: "2×2" },
                { id: "c", label: "4×2" },
              ],
              answerId: "b",
              explain: String.raw`\(\mathbf{A}^T\) is \(2\times4\), so \((2×4)(4×2)=(2×2)\).`,
            },
          ],
        },
      ],
    },
  ],
};
