
// ✅ Matches your Practice theme (radial bg, white/10 borders, glass cards, emerald/sky accents)
// - Two cards: Part 1 + Part 2
// - Each has: “Read material” + “Practice now”
// - Uses $$ ... $$-friendly text elsewhere (no math needed here)

import Link from "next/link";

type Part = {
  id: "part-1" | "part-2";
  badge: string;
  title: string;
  subtitle: string;
  learnHref: string;
  practiceHref: string;
  bullets: string[];
};

const parts: Part[] = [
  {
    id: "part-1",
    badge: "Start here",
    title: "Vectors — Part 1",
    subtitle: "Foundations, geometry intuition, NumPy shapes, and core operations",
    learnHref: "/practice/review/vectors_part1",
    practiceHref: "/practice?section=module-0-vectors-part-1&difficulty=all&topic=vectors_part1",
    bullets: [
      "Vector meaning (algebra vs geometry) and ℝⁿ notation",
      "Row vs column orientation + transpose (why it matters)",
      "NumPy representations: (n,), (1,n), (n,1) + shape intuition",
      "Add/subtract, scalar multiply (lists vs arrays gotcha)",
      "Magnitude (norm) + unit vectors",
      "Dot product: compute + interpret sign/angle",
      "Hadamard vs dot vs outer product (what you get)",
      "Projection idea (setup for decompositions)",
    ],
  },
  {
    id: "part-2",
    badge: "Next",
    title: "Vectors — Part 2",
    subtitle: "Linear combinations → independence → span/subspace → basis",
    learnHref: "/practice/review/vectors_part2",
    practiceHref: "/practice?section=module-0-vectors-part-2&difficulty=all&topic=vectors_part2",
    bullets: [
      "Finite vs infinite vs empty vector sets",
      "Linear weighted combinations (component-wise)",
      "Independent vs dependent (including zero-vector rule)",
      "Span (line vs all of ℝ²) and dimension intuition",
      "Subspace tests: 0 vector + closure rules",
      "Basis checks (ℝ² det ≠ 0 intuition)",
      "Coordinates in a basis (solve for c₁, c₂)",
      "Connect to projection + orthogonal decomposition",
    ],
  },
];

function PartCard({ part }: { part: Part }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-black tracking-tight text-white/90">
              {part.title}
            </div>
            <div className="mt-1 text-sm text-white/70">{part.subtitle}</div>
          </div>

          <span
            className={[
              "shrink-0 rounded-full border px-3 py-1 text-[11px] font-extrabold",
              part.id === "part-1"
                ? "border-emerald-300/30 bg-emerald-300/10 text-white"
                : "border-sky-300/30 bg-sky-300/10 text-white",
            ].join(" ")}
          >
            {part.badge}
          </span>
        </div>

        <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs font-extrabold text-white/70">What you’ll learn</div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-white/70">
            {part.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>

        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <Link
            href={part.learnHref}
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15"
          >
            Read material
          </Link>

          <Link
            href={part.practiceHref}
            className={[
              "rounded-xl border px-3 py-2 text-xs font-extrabold transition",
              part.id === "part-1"
                ? "border-emerald-300/30 bg-emerald-300/10 text-white hover:bg-emerald-300/15"
                : "border-sky-300/30 bg-sky-300/10 text-white hover:bg-sky-300/15",
            ].join(" ")}
          >
            Practice now
          </Link>
        </div>

        <div className="text-xs text-white/50">
          “Practice now” opens a pre-filtered practice session for this part.
        </div>
      </div>
    </div>
  );
}

export default function VectorsLandingPage() {
  return (
    <div className="min-h-screen p-4 md:p-6 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
      <div className="mx-auto max-w-5xl">
        {/* header */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="text-lg font-black tracking-tight">Vectors</div>
              <div className="mt-1 text-sm text-white/70">
                Two-part track: Part 1 builds the fundamentals; Part 2 builds the linear algebra core
                (combinations → independence → span/subspace → basis).
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/practice?section=module-0-vectors-part-1&difficulty=easy&topic=vectors_part1"
                className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-300/15"
              >
                Quick start • Part 1 • Easy
              </Link>

              <Link
                href="/practice?section=module-0-vectors-part-2&difficulty=easy&topic=vectors_part2"
                className="rounded-xl border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-xs font-extrabold text-white hover:bg-sky-300/15"
              >
                Jump • Part 2 • Easy
              </Link>
            </div>
          </div>
        </div>

        {/* cards */}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {parts.map((p) => (
            <PartCard key={p.id} part={p} />
          ))}
        </div>

        {/* recommended path */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
          <div className="text-sm font-black text-white/90">Recommended path</div>

          <ol className="mt-3 space-y-2 text-sm text-white/70">
            <li className="flex gap-2">
              <span className="font-extrabold text-white/90">1.</span>
              <span>
                Do <span className="font-extrabold text-white/90">Part 1</span> until orientation,
                shapes, norm/unit vectors, and dot product feel automatic.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-extrabold text-white/90">2.</span>
              <span>
                Move to <span className="font-extrabold text-white/90">Part 2</span> to master
                independence/span/basis (these unlock everything later).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-extrabold text-white/90">3.</span>
              <span>
                Revisit dot-product geometry whenever projection/decomposition feels “mystical.”
              </span>
            </li>
          </ol>
        </div>

        <div className="mt-4 text-xs text-white/50">
          If your material route isn’t <code>/learn</code>, just swap the <code>learnHref</code> links.
        </div>
      </div>
    </div>
  );
}
