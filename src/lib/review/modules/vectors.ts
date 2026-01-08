import type { ReviewModule } from "@/lib/review/types";

export const vectorsModule: ReviewModule = {
  id: "vectors_part1",
  title: "Vectors",
  subtitle: "Foundations you’ll reuse everywhere",
  startPracticeHref: (topicId) =>
    `/practice?section=module-0-vectors&difficulty=easy&topic=${encodeURIComponent(
      topicId
    )}`,
  topics: [
    {
      id: "vectors",
      label: "What is a vector?",
      minutes: 6,
      summary: "A vector is one object that holds many numbers.",
      cards: [
        {
          type: "text",
          id: "t1",
          title: "Definition",
          markdown: String.raw`
A **vector** is a single object that holds multiple numbers.

$$
\vec v =
\begin{bmatrix}
v_1\\
v_2\\
\vdots\\
v_n
\end{bmatrix}
\in \mathbb{R}^n
$$

- **Dimension**: the number of entries $n$.
- In 2D/3D, you can draw $\vec v$ as an arrow from the origin to the point $(v_1, v_2)$ or $(v_1, v_2, v_3)$.
`.trim(),
        },
        {
          type: "sketch",
          id: "s1",
          title: "Drag the vector",
          sketchId: "vec.basics",
          height: 380,
        },
        {
          type: "quiz",
          id: "q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "q1a",
              prompt: String.raw`If $\vec v = (3, -2)$, what is the dimension?`,
              choices: [
                { id: "a", label: "2" },
                { id: "b", label: "3" },
                { id: "c", label: "Depends on orientation" },
              ],
              answerId: "a",
              explain: String.raw`Dimension = number of entries. Here $\vec v$ has 2 entries.`,
            },
          ],
        },
      ],
    },

    {
      id: "dot",
      label: "Dot product",
      minutes: 10,
      summary: "A single number that measures alignment.",
      cards: [
        {
          type: "text",
          id: "t2",
          title: "Formula + meaning",
          markdown: String.raw`
The **dot product** of $\vec u,\vec v\in\mathbb{R}^n$ is a single number:

$$
\vec u\cdot \vec v = \sum_{i=1}^{n} u_i v_i
$$

In 2D:

$$
(u_1,u_2)\cdot(v_1,v_2)=u_1v_1+u_2v_2
$$

**Sign meaning (geometry):**
- $\vec u\cdot\vec v>0$: mostly same direction
- $\vec u\cdot\vec v=0$: perpendicular (orthogonal)
- $\vec u\cdot\vec v<0$: mostly opposite direction

Angle relation:

$$
\vec u\cdot\vec v=\|\vec u\|\,\|\vec v\|\cos\theta
$$
`.trim(),
        },
        {
          type: "sketch",
          id: "s2",
          title: "Angle + dot",
          sketchId: "vec.dot",
          height: 420,
        },
        {
          type: "quiz",
          id: "q2",
          title: "Quick check",
          questions: [
            {
              kind: "numeric",
              id: "q2a",
              prompt: String.raw`Compute $(1,2)\cdot(3,4)$.`,
              answer: 11,
              tolerance: 0,
              explain: String.raw`$1\cdot3 + 2\cdot4 = 11$.`,
            },
          ],
        },
      ],
    },

    {
      id: "projection",
      label: "Projection + decomposition",
      minutes: 12,
      summary: "Split a vector into parallel + perpendicular parts.",
      cards: [
        {
          type: "text",
          id: "t3",
          title: "Core formulas",
          markdown: String.raw`
Let $\vec t$ be the **target** vector and $\vec r\neq \vec 0$ be the **reference** vector.

**Projection of $\vec t$ onto $\vec r$:**

$$
\operatorname{proj}_{\vec r}(\vec t)
=
\frac{\vec t\cdot \vec r}{\vec r\cdot \vec r}\,\vec r
$$

**Decomposition (parallel + perpendicular):**

$$
\vec t_{\parallel \vec r}=\operatorname{proj}_{\vec r}(\vec t),
\qquad
\vec t_{\perp \vec r}=\vec t-\vec t_{\parallel \vec r}
$$

**Key check:**

$$
\vec t_{\perp \vec r}\cdot \vec r = 0
$$

> Intuition: $\vec t_{\parallel \vec r}$ lies along $\vec r$, and $\vec t_{\perp \vec r}$ is the “leftover” part at a right angle.
`.trim(),
        },
        {
          type: "sketch",
          id: "s3",
          title: "Drag τ and r",
          sketchId: "vec.projection",
          height: 440,
        },
      ],
    },
  ],
};
