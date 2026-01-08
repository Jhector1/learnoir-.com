import type { ReviewModule } from "@/lib/review/types";

export const vectorsPart2Module: ReviewModule = {
  id: "vectors_part2",
  title: "Vectors, Part 2",
  subtitle: "Sets → combos → independence → span/subspace → basis",
  startPracticeHref: (topicId) =>
    `/practice?section=module-1-vectors-part-2&difficulty=easy&topic=${encodeURIComponent(
      topicId
    )}`,
  topics: [
    {
      id: "vector-sets",
      label: "Vector sets",
      minutes: 6,
      summary: "A set is just a collection of vectors (finite, infinite, or empty).",
      cards: [
        {
          type: "text",
          id: "t1",
          title: "What is a vector set?",
          markdown: String.raw`
A **vector set** is just a **collection** of vectors.

$$
V=\{\vec v_1,\vec v_2,\dots,\vec v_n\}
$$

A set can be:
- **finite** (a limited number of vectors)
- **infinite** (e.g., “all scalar multiples of a vector”)
- **empty**: $V=\{\}$

> Think: “put vectors in a bag.”
`.trim(),
        },
        {
          type: "quiz",
          id: "q1",
          title: "Quick check",
          questions: [
            {
              kind: "mcq",
              id: "q1a",
              prompt: String.raw`Is $V=\{\lambda\begin{bmatrix}2\\-1\end{bmatrix}\mid \lambda\in\mathbb{R}\}$ finite or infinite?`,
              choices: [
                { id: "a", label: "Finite" },
                { id: "b", label: "Infinite" },
                { id: "c", label: "Empty" },
              ],
              answerId: "b",
              explain: String.raw`There are infinitely many real values of $\lambda$, so you get infinitely many vectors.`,
            },
          ],
        },
      ],
    },

    {
      id: "linear-combos",
      label: "Linear weighted combinations",
      minutes: 10,
      summary: "Multiply vectors by scalars and add them to make a new vector.",
      cards: [
        {
          type: "text",
          id: "t2",
          title: "Definition",
          markdown: String.raw`
A **linear weighted combination** means: multiply vectors by scalars, then add.

$$
\vec w=\lambda_1\vec v_1+\lambda_2\vec v_2+\cdots+\lambda_n\vec v_n
$$

Rules:
- All vectors must be in the **same** $\mathbb{R}^n$
- Scalars $\lambda_i$ can be any real numbers (including $0$ and negatives)

Example:

$$
\lambda_1=1,\;\lambda_2=2,\;\lambda_3=-3
$$

$$
\vec v_1=\begin{bmatrix}4\\5\\1\end{bmatrix},\;
\vec v_2=\begin{bmatrix}-4\\0\\-4\end{bmatrix},\;
\vec v_3=\begin{bmatrix}1\\3\\2\end{bmatrix}
$$

$$
\vec w=\lambda_1\vec v_1+\lambda_2\vec v_2+\lambda_3\vec v_3
$$
`.trim(),
        },
        {
          type: "quiz",
          id: "q2",
          title: "Quick check",
          questions: [
            {
              kind: "numeric",
              id: "q2a",
              prompt: String.raw`Let $\vec v_1=(1,2)$, $\vec v_2=(3,-1)$. Compute $\vec w=2\vec v_1-\vec v_2$. What is $w_x$?`,
              answer: -1,
              tolerance: 0,
              explain: String.raw`$2(1,2)-(3,-1)=(2,4)-(3,-1)=(-1,5)$, so $w_x=-1$.`,
            },
          ],
        },
      ],
    },

    {
      id: "independence",
      label: "Linear independence",
      minutes: 12,
      summary: "Independent means no vector is redundant.",
      cards: [
        {
          type: "text",
          id: "t3",
          title: "Concept + the zero-vector test",
          markdown: String.raw`
A set is:

- **dependent** if at least one vector can be written as a linear combination of the others.
- **independent** if no vector can be written that way.

The “standard test statement” is the **zero-vector equation**:

$$
\vec 0=\lambda_1\vec v_1+\lambda_2\vec v_2+\cdots+\lambda_n\vec v_n
$$

- If there exists a **non-trivial** solution (at least one $\lambda_i\neq 0$), the set is **dependent**.
- If the **only** solution is $\lambda_1=\cdots=\lambda_n=0$, the set is **independent**.

Two important facts:
- Independence is a property of the **set**, not one vector.
- Any set containing $\vec 0$ is automatically **dependent**.
`.trim(),
        },
        {
          type: "sketch",
          id: "s1",
          title: "Drag: dependent vs independent",
          sketchId: "vec.independence",
          height: 420,
        },
      ],
    },

    {
      id: "span-subspace",
      label: "Span and subspace",
      minutes: 12,
      summary: "All possible linear combinations form a subspace.",
      cards: [
        {
          type: "text",
          id: "t4",
          title: "Span creates a subspace",
          markdown: String.raw`
The **span** of vectors is the set of **all** linear combinations you can make.

For vectors $\vec v_1,\dots,\vec v_k$:

$$
\operatorname{span}\{\vec v_1,\dots,\vec v_k\}
=
\left\{
\lambda_1\vec v_1+\cdots+\lambda_k\vec v_k
\;\middle|\;
\lambda_1,\dots,\lambda_k\in\mathbb{R}
\right\}
$$

This is a **subspace** because:
- it contains $\vec 0$ (choose all $\lambda_i=0$)
- it stays closed under addition and scalar multiplication

Helpful wording:
- **Span** = the “mixing process”
- **Subspace** = the infinite set you get
`.trim(),
        },
        {
          type: "sketch",
          id: "s2",
          title: "Drag vectors: see the span",
          sketchId: "vec.span",
          height: 420,
        },
      ],
    },

    {
      id: "basis",
      label: "Basis",
      minutes: 12,
      summary: "A basis is an independent set that spans a subspace (unique coordinates!).",
      cards: [
        {
          type: "text",
          id: "t5",
          title: "Basis = span + independence",
          markdown: String.raw`
A set of vectors is a **basis** for a subspace if it:

1) **spans** the subspace  
2) is **linearly independent**

So:

$$
\text{basis}=\text{span}+\text{independence}
$$

Why independence matters:
- It guarantees **unique coordinates**.
- If vectors are dependent, the same point can be written in many different ways.

Standard basis in $\mathbb{R}^2$:

$$
\left\{
\begin{bmatrix}1\\0\end{bmatrix},
\begin{bmatrix}0\\1\end{bmatrix}
\right\}
$$

But many other bases exist.
`.trim(),
        },
        {
          type: "sketch",
          id: "s3",
          title: "Same point, different bases",
          sketchId: "vec.basis",
          height: 440,
        },
      ],
    },
  ],
};
