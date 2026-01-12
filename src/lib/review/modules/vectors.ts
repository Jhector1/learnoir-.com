import type { ReviewModule } from "@/lib/review/types";

export const vectorsModule: ReviewModule = {
  id: "vectors_part1",
  title: "Vectors — Part 1",
  subtitle: "The core objects + operations that power the rest of linear algebra",
  startPracticeHref: (topicId) =>
    `/practice?section=module-0-vectors&difficulty=easy&topic=${encodeURIComponent(
      topicId
    )}`,
  topics: [
    // ------------------------------------------------------------
    // TOPIC 1 — VECTORS (intro)
    // ------------------------------------------------------------
    {
      id: "vectors",
      label: "Vectors: meaning, dimension, orientation",
      minutes: 16,
      summary:
        "Vectors are ordered number lists. Learn dimension, row vs column, and what vectors mean geometrically.",
      cards: [
        {
          type: "text",
          id: "v_t1",
          title: "What a vector is",
          markdown: String.raw`
A **vector** is an **ordered collection of numbers** treated as one mathematical object.

$$
\mathbf{v}=
\begin{bmatrix}
v_1\\
v_2\\
\vdots\\
v_n
\end{bmatrix}
\in \mathbb{R}^n
$$

- The symbol $\mathbb{R}^n$ means: **real-valued vectors with $n$ entries**.
- You’ll often see vectors written in bold $\mathbf{v}$, with an arrow $\vec v$, or as a tuple $(v_1,\dots,v_n)$.
`.trim(),
        },
        {
          type: "text",
          id: "v_t2",
          title: "Dimensionality vs orientation",
          markdown: String.raw`
### Dimensionality (math)
The **dimension** of a vector is the **number of entries**.

- $(3,-2)$ is in $\mathbb{R}^2$
- $(5,1,0)$ is in $\mathbb{R}^3$

### Orientation (row vs column)
A vector can be written as a **column** or a **row**:

$$
\text{column: }
\begin{bmatrix}1\\2\\3\end{bmatrix}
\qquad
\text{row: }
\begin{bmatrix}1&2&3\end{bmatrix}
$$

**Convention:** in linear algebra, vectors are assumed **column-shaped** unless stated otherwise.

A **transpose** flips orientation:

$$
\left(\mathbf{v}^T\right)^T=\mathbf{v}
$$
`.trim(),
        },
        {
          type: "text",
          id: "v_t4",
          title: "Algebra view vs geometry view",
          markdown: String.raw`
You can think about vectors in two helpful ways:

### Algebra (data) view
A vector is just a structured list of numbers: sales per month, sensor readings, etc.

### Geometry (arrow) view
In 2D/3D, a vector can be drawn as an arrow with:
- **tail** (start) and **head** (end)
- **magnitude** (length) and **direction** (angle)

A common drawing choice is **standard position**: tail at the origin, head at the coordinate $(v_1,\; v_2)$ or $(v_1,\; v_2,\; v_3)$.

> Coordinates describe a *point*. A vector describes a *displacement*. They match nicely when the tail is at the origin.
`.trim(),
        },
        {
          type: "sketch",
          id: "v_s1",
          title: "Drag the vector",
          sketchId: "vec.basics",
          height: 380,
        },
        {
          type: "text",
          id: "v_t5",
          title: "Basic operations: add, subtract, scale",
          markdown: String.raw`
### Vector addition / subtraction (element-by-element)
If $\mathbf{v},\mathbf{w}\in\mathbb{R}^n$:

$$
\mathbf{v}+\mathbf{w}=
\begin{bmatrix}v_1+w_1\\ \vdots\\ v_n+w_n\end{bmatrix},
\qquad
\mathbf{v}-\mathbf{w}=
\begin{bmatrix}v_1-w_1\\ \vdots\\ v_n-w_n\end{bmatrix}
$$

They must have the **same number of entries**.

~~~python
import numpy as np

v = np.array([4, 5, 6])
w = np.array([10, 20, 30])
print(v + w)  # [14 25 36]
print(v - w)  # [-6 -15 -24]
~~~

### Scalar-vector multiplication
A scalar is a standalone number (often $\alpha,\lambda$):

$$
\lambda\mathbf{v}=
\begin{bmatrix}\lambda v_1\\ \vdots\\ \lambda v_n\end{bmatrix}
$$

Scaling changes the magnitude. Negative scalars flip direction.
`.trim(),
        },
        {
          type: "text",
          id: "v_t6",
          title: "The zero vector + a Python gotcha",
          markdown: String.raw`
### The zero vector
$\mathbf{0}$ means “all entries are zero.”

### Python gotcha: lists vs NumPy arrays
~~~python
import numpy as np

s = 2
a = [3, 4, 5]       # list
b = np.array(a)     # array

print(a * s)        # [3,4,5,3,4,5]   (list repetition!)
print(b * s)        # [ 6  8 10 ]     (real scalar-vector multiply)
~~~

So for linear algebra, **prefer NumPy arrays**.
`.trim(),
        },
        {
          type: "text",
          id: "v_t8",
          title: "Magnitude (norm) and unit vectors",
          markdown: String.raw`
The **magnitude** (norm) of $\mathbf{v}$ is:

$$
\|\mathbf{v}\|=\sqrt{\sum_{i=1}^{n} v_i^2}
$$

A **unit vector** has magnitude $1$:

$$
\hat{\mathbf{v}}=\frac{1}{\|\mathbf{v}\|}\mathbf{v}
$$

⚠️ The **zero vector** has no direction, so it cannot be normalized.
`.trim(),
        },
        {
          type: "quiz",
          id: "v_q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "v_q1a",
              prompt: String.raw`If $\mathbf{v}=(3,-2)$, what is its dimension (in the math sense)?`,
              choices: [
                { id: "a", label: "2" },
                { id: "b", label: "3" },
                { id: "c", label: "Depends on row/column" },
              ],
              answerId: "a",
              explain: String.raw`Math dimension = number of entries. Here there are 2 numbers.`,
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 2 — NUMPY SHAPES + BROADCASTING
    // ------------------------------------------------------------
    {
      id: "numpy",
      label: "NumPy shapes + broadcasting",
      minutes: 10,
      summary: "1D vs row vs column, shapes, transpose, and why broadcasting creates matrices.",
      cards: [
        {
          type: "text",
          id: "n_t1",
          title: "Vectors in NumPy: 1D vs row vs column",
          markdown: String.raw`
In Python, the *data structure* matters.

~~~python
import numpy as np

asList  = [1, 2, 3]                 # list (not great for LA)
asArray = np.array([1, 2, 3])        # 1D array (shape: (3,))
rowVec  = np.array([[1, 2, 3]])      # row      (shape: (1,3))
colVec  = np.array([[1], [2], [3]])  # column   (shape: (3,1))
~~~

Check shapes:

~~~python
print(asArray.shape)  # (3,)
print(rowVec.shape)   # (1, 3)
print(colVec.shape)   # (3, 1)
~~~

**Math dimension** = number of entries.  
**NumPy shape** = how the data is stored/printed.
`.trim(),
        },
        {
          type: "text",
          id: "n_t2",
          title: "Broadcasting: when shapes create surprises",
          markdown: String.raw`
Broadcasting can turn “adding vectors” into building a matrix:

~~~python
import numpy as np

v = np.array([[1, 2, 3]]).T   # (3,1)
w = np.array([[10, 20]])      # (1,2)
print(v + w)                  # (3,2) result
~~~

This is powerful, but it means **orientation and shape matter**.
`.trim(),
        },
        {
          type: "sketch",
          id: "n_s1",
          title: "NumPy shapes + broadcasting (interactive)",
          sketchId: "vec.numpy",
          height: 420,
        },
        {
          type: "quiz",
          id: "n_q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "n_q1a",
              prompt: String.raw`Which NumPy shape represents a 3-entry column vector?`,
              choices: [
                { id: "a", label: "(3,)" },
                { id: "b", label: "(1, 3)" },
                { id: "c", label: "(3, 1)" },
              ],
              answerId: "c",
              explain: String.raw`A 3-entry column vector is 3 rows by 1 column → (3,1).`,
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 3 — DOT PRODUCT
    // ------------------------------------------------------------
    {
      id: "dot",
      label: "Dot product: formula, meaning, properties",
      minutes: 14,
      summary:
        "The dot product returns one number that captures alignment and drives lots of algorithms.",
      cards: [
        {
          type: "text",
          id: "d_t1",
          title: "Dot product (algebra definition)",
          markdown: String.raw`
For $\mathbf{u},\mathbf{v}\in\mathbb{R}^n$, the dot product is:

$$
\mathbf{u}\cdot\mathbf{v}=\sum_{i=1}^{n}u_i v_i
$$

Example:
$$
(1,2)\cdot(3,4)=11
$$

In NumPy:
~~~python
import numpy as np

u = np.array([1, 2])
v = np.array([3, 4])

print(np.dot(u, v))  # 11
print(u @ v)         # 11
~~~
`.trim(),
        },
        {
          type: "text",
          id: "d_t2",
          title: "Geometric meaning: alignment + angle",
          markdown: String.raw`
$$
\mathbf{u}\cdot\mathbf{v}=\|\mathbf{u}\|\,\|\mathbf{v}\|\cos\theta
$$
**Sign meaning (geometry):**
- $\vec u\cdot\vec v>0$: mostly same direction
- $\vec u\cdot\vec v=0$: perpendicular (orthogonal)
- $\vec u\cdot\vec v<0$: mostly opposite direction

`.trim(),
        },
        {
          type: "sketch",
          id: "d_s1",
          title: "Angle + dot",
          sketchId: "vec.dot",
          height: 420,
        },
        {
          type: "text",
          id: "d_t3",
          title: "Useful dot product properties",
          markdown: String.raw`
- Commutative: $\mathbf{a}\cdot\mathbf{b}=\mathbf{b}\cdot\mathbf{a}$
- Distributive: $\mathbf{a}\cdot(\mathbf{b}+\mathbf{c})=\mathbf{a}\cdot\mathbf{b}+\mathbf{a}\cdot\mathbf{c}$
- Scaling: $(\lambda\mathbf{a})\cdot\mathbf{b}=\lambda(\mathbf{a}\cdot\mathbf{b})$
`.trim(),
        },
        {
          type: "quiz",
          id: "d_q1",
          title: "Quick check",
          questions: [
            {
              kind: "numeric",
              id: "d_q1a",
              prompt: String.raw`Compute $(1,2)\cdot(3,4)$.`,
              answer: 11,
              tolerance: 0,
              explain: String.raw`$1\cdot3 + 2\cdot4 = 11$.`,
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 4 — HADAMARD + OUTER (render-safe)
    // ------------------------------------------------------------
    {
      id: "products",
      label: "Hadamard vs outer product",
      minutes: 10,
      summary: "Element-wise multiplication vs matrix-building multiplication.",
      cards: [
        {
          type: "text",
          id: "pr_t1",
          title: "Two different “multiplications”",
          markdown: String.raw`
### Hadamard (element-wise) product
$$
\mathbf{a}\odot\mathbf{b}=(a_1b_1,\ a_2b_2,\ \dots)
$$

Only valid when lengths match.

### Outer product
$$
\mathbf{a}\mathbf{b}^T
$$

Always produces a matrix of size $\text{len}(a)\times\text{len}(b)$.

Example structure (column $\cdot$ row):
$$
\begin{bmatrix}
a_1\\
a_2\\
\vdots\\
a_m
\end{bmatrix}
\begin{bmatrix}
b_1 & b_2 & \cdots & b_n
\end{bmatrix}
=
\begin{bmatrix}
a_1b_1 & a_1b_2 & \cdots & a_1b_n\\
a_2b_1 & a_2b_2 & \cdots & a_2b_n\\
\vdots & \vdots & \ddots & \vdots\\
a_mb_1 & a_mb_2 & \cdots & a_mb_n
\end{bmatrix}
$$
`.trim(),
        },
        {
          type: "sketch",
          id: "pr_s1",
          title: "Hadamard vs outer product (interactive)",
          sketchId: "vec.products",
          height: 420,
        },
      ],
    },

    // ------------------------------------------------------------
    // TOPIC 5 — PROJECTION (render-safe MCQ labels)
    // ------------------------------------------------------------
    {
      id: "projection",
      label: "Projection + orthogonal decomposition",
      minutes: 16,
      summary:
        "Project onto a direction, then split into parallel and perpendicular components.",
      cards: [
        {
          type: "text",
          id: "p_t1",
          title: "Projection: the closest point idea",
          markdown: String.raw`
Projection answers:  
**“What part of $\mathbf{t}$ lies along the direction of $\mathbf{r}$?”**

Think “drop a perpendicular” to the line spanned by $\mathbf{r}$.
`.trim(),
        },
        {
          type: "text",
          id: "p_t2",
          title: "Core formula: project t onto r",
          markdown: String.raw`
$$
\operatorname{proj}_{\mathbf{r}}(\mathbf{t})
=
\frac{\mathbf{t}\cdot \mathbf{r}}{\mathbf{r}\cdot \mathbf{r}}\,\mathbf{r}
$$
`.trim(),
        },
        {
          type: "text",
          id: "p_t3",
          title: "Decomposition: parallel + perpendicular",
          markdown: String.raw`
$$
\mathbf{t}_{\parallel \mathbf{r}}=\operatorname{proj}_{\mathbf{r}}(\mathbf{t}),
\qquad
\mathbf{t}_{\perp \mathbf{r}}=\mathbf{t}-\mathbf{t}_{\parallel \mathbf{r}}
$$

Check:
$$
\mathbf{t}_{\perp \mathbf{r}}\cdot \mathbf{r}=0
$$
`.trim(),
        },
        {
          type: "sketch",
          id: "p_s1",
          title: "Drag target and reference",
          sketchId: "vec.projection",
          height: 440,
        },
        {
          type: "quiz",
          id: "p_q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "p_q1a",
              prompt: String.raw`Which formula gives the projection of $\mathbf{t}$ onto $\mathbf{r}$?`,
              choices: [
                {
                  id: "a",
                  label: String.raw`$\dfrac{\mathbf{r}\cdot\mathbf{r}}{\mathbf{t}\cdot\mathbf{r}}\,\mathbf{r}$`,
                },
                {
                  id: "b",
                  label: String.raw`$\dfrac{\mathbf{t}\cdot\mathbf{r}}{\mathbf{r}\cdot\mathbf{r}}\,\mathbf{r}$`,
                },
                {
                  id: "c",
                  label: String.raw`$(\mathbf{t}\cdot\mathbf{r})\,\mathbf{r}$`,
                },
              ],
              answerId: "b",
              explain: String.raw`Projection uses $(\mathbf{t}\cdot\mathbf{r})/(\mathbf{r}\cdot\mathbf{r})$ times $\mathbf{r}$.`,
            },
          ],
        },
      ],
    },
  ],
};
