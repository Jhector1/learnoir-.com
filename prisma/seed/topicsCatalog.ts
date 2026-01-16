import type { TopicSlug } from "./data";

export const TOPIC_CATALOG: Record<TopicSlug, { titleKey: string; meta?: any }> = {
  "m2.matrices_intro": {
    titleKey: "topic.m2.matrices_intro",
    meta: { label: "Matrices: meaning, shape, and why they matter", minutes: 12 },
  },
  "m2.index_slice": {
    titleKey: "topic.m2.index_slice",
    meta: { label: "Indexing + slicing (submatrices)", minutes: 14 },
  },
  "m2.special": {
    titleKey: "topic.m2.special",
    meta: { label: "Special matrices", minutes: 16 },
  },
  "m2.elementwise_shift": {
    titleKey: "topic.m2.elementwise_shift",
    meta: { label: "Element-wise math + shifting", minutes: 18 },
  },
  "m2.matmul": {
    titleKey: "topic.m2.matmul",
    meta: { label: "Standard matrix multiplication", minutes: 20 },
  },
  "m2.matvec": {
    titleKey: "topic.m2.matvec",
    meta: { label: "Matrix–vector multiplication", minutes: 18 },
  },
  "m2.transpose_liveevil": {
    titleKey: "topic.m2.transpose_liveevil",
    meta: { label: "Transpose + LIVE EVIL", minutes: 14 },
  },
  "m2.symmetric": {
    titleKey: "topic.m2.symmetric",
    meta: { label: "Symmetric matrices + AᵀA", minutes: 16 },
  },
};
