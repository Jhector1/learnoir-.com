"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Props = {
  content: string;
  className?: string;
};

export default function MathMarkdown({ content, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="my-2 ml-5 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 ml-5 list-decimal">{children}</ol>,
          li: ({ children }) => <li className="my-1">{children}</li>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
