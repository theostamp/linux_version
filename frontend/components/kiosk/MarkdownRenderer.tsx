'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Simple Markdown to JSX renderer for kiosk displays
 * Supports: **bold**, ###headings, lists, and line breaks
 */
export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const renderContent = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines
      if (!line.trim()) {
        continue;
      }

      // Headings (### Heading)
      if (line.startsWith('###')) {
        const text = line.replace(/^###\s*/, '').trim();
        elements.push(
          <h3 key={key++} className="text-lg font-bold text-white mt-4 mb-2">
            {renderInlineFormatting(text)}
          </h3>
        );
        continue;
      }

      // Headings (## Heading)
      if (line.startsWith('##')) {
        const text = line.replace(/^##\s*/, '').trim();
        elements.push(
          <h2 key={key++} className="text-xl font-bold text-white mt-4 mb-2">
            {renderInlineFormatting(text)}
          </h2>
        );
        continue;
      }

      // Horizontal rule (---)
      if (line.trim() === '---') {
        elements.push(
          <hr key={key++} className="border-t border-purple-500/30 my-3" />
        );
        continue;
      }

      // List items (- item or * item)
      if (line.trim().match(/^[-*]\s/)) {
        const text = line.replace(/^[-*]\s*/, '').trim();
        elements.push(
          <div key={key++} className="flex items-start space-x-2 my-1">
            <span className="text-purple-400 mt-1">•</span>
            <span className="text-sm text-gray-200 flex-1">
              {renderInlineFormatting(text)}
            </span>
          </div>
        );
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={key++} className="text-sm text-gray-200 my-2 leading-relaxed">
          {renderInlineFormatting(line)}
        </p>
      );
    }

    return elements;
  };

  const renderInlineFormatting = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let key = 0;

    // Match **bold**, *italic*, and [link](url) patterns
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      // Add text before match
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index));
      }

      const matched = match[0];

      // **bold**
      if (matched.startsWith('**') && matched.endsWith('**')) {
        const boldText = matched.slice(2, -2);
        parts.push(
          <strong key={`bold-${key++}`} className="font-bold text-white">
            {boldText}
          </strong>
        );
      }
      // *italic*
      else if (matched.startsWith('*') && matched.endsWith('*')) {
        const italicText = matched.slice(1, -1);
        parts.push(
          <em key={`italic-${key++}`} className="italic text-purple-200">
            {italicText}
          </em>
        );
      }
      // [text](url)
      else if (matched.match(/\[([^\]]+)\]\(([^)]+)\)/)) {
        const linkMatch = matched.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          const [, linkText, url] = linkMatch;
          parts.push(
            <a
              key={`link-${key++}`}
              href={url}
              className="text-blue-400 hover:text-blue-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {linkText}
            </a>
          );
        }
      }

      currentIndex = match.index + matched.length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`markdown-content ${className}`}>
      {renderContent()}
    </div>
  );
}
