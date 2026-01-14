// src/app/practice/review/[moduleId]/page.tsx
"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import ReviewModuleView from "@/components/review/ReviewModuleView";
import type { ReviewModule } from "@/lib/review/types";

// ✅ Import modules here (add more as you create them)
import { vectorsModule,  } from "@/lib/review/modules/vectors";
import {vectorsPart2Module} from "@/lib/review/modules/vectorsPart2Module";
import {matricesPart1Module} from "@/lib/review/modules/matricesPart1Module";
// ✅ Register modules by id
const MODULES: Record<string, ReviewModule> = {
  [vectorsModule.id]: vectorsModule,
  [vectorsPart2Module.id]: vectorsPart2Module,
  [matricesPart1Module.id]: matricesPart1Module,
};

export default function ReviewModulePage() {
  const params = useParams<{ moduleId: string }>();
  const router = useRouter();

  const moduleId = params?.moduleId ?? "";

  const mod = useMemo(() => MODULES[moduleId], [moduleId]);
  console.log("Loaded review module:", mod);

  if (!mod) {
    const known = Object.keys(MODULES);

    return (
      <div className="min-h-screen p-6 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="text-lg font-black">Review module not found</div>
          <div className="mt-2 text-sm text-white/70">
            Module <code className="text-white/90">{moduleId}</code> is not
            registered.
          </div>

          {known.length ? (
            <div className="mt-4">
              <div className="text-xs font-extrabold text-white/60">
                Available modules
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {known.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => router.push(`/practice/review/${id}`)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/80 hover:bg-white/10"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => router.push("/practice/sections")}
            className="mt-5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15"
          >
            Back to Practice Sections
          </button>
        </div>
      </div>
    );
  }

  return <ReviewModuleView mod={mod} />;
}
