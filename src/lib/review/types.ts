export type ReviewTopicId = string;

export type ReviewCard =
  | {
      type: "text";
      id: string;
      title?: string;
      markdown: string; // short, clean content
    }
  | {
      type: "sketch";
      id: string;
      title?: string;
      sketchId: string; // maps to a reusable sketch component
      props?: Record<string, any>; // configuration
      height?: number; // UI height
    }
  | {
      type: "quiz";
      id: string;
      title?: string;
      questions: ReviewQuestion[];
      passScore?: number; // default 1.0
    };

export type ReviewQuestion =
  | {
      kind: "mcq";
      id: string;
      prompt: string;
      choices: { id: string; label: string }[];
      answerId: string;
      explain?: string;
    }
  | {
      kind: "numeric";
      id: string;
      prompt: string;
      answer: number;
      tolerance?: number;
      explain?: string;
    };

export type ReviewTopic = {
  id: ReviewTopicId;
  label: string;
  minutes?: number;
  summary?: string;
  cards: ReviewCard[];
};

export type ReviewModule = {
  id: string;           // e.g. "vectors-1"
  title: string;        // e.g. "Vectors"
  subtitle?: string;    // e.g. "Foundations"
  topics: ReviewTopic[];
  // optional: deep-link into practice
  startPracticeHref?: (topicId: string) => string;
};
