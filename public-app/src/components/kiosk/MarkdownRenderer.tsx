'use client';

import { useMemo } from 'react';

interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatInline = (value: string) => {
  let formatted = escapeHtml(value);

  // Bold **text**
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic *text*
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code `text`
  formatted = formatted.replace(/`(.+?)`/g, '<code class="bg-slate-900/40 px-1 py-0.5 rounded">$1</code>');

  // Links [text](url)
  formatted = formatted.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, (_match, text, url) => {
    const safeUrl = typeof url === 'string' ? escapeHtml(url) : '';
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-200 underline">${text}</a>`;
  });

  return formatted;
};

const buildHtml = (content: string): string => {
  const lines = content.split(/\r?\n/);
  const htmlParts: string[] = [];
  const listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      htmlParts.push(`<ul class="list-disc list-inside space-y-1">${listItems.join('')}</ul>`);
      listItems.length = 0;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('- ')) {
      const listContent = trimmed.replace(/^-+\s*/, '');
      listItems.push(`<li>${formatInline(listContent)}</li>`);
      return;
    }

    flushList();
    htmlParts.push(`<p class="leading-snug">${formatInline(trimmed)}</p>`);
  });

  flushList();

  return htmlParts.join('');
};

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const sanitizedContent = content?.trim();

  const html = useMemo(() => {
    if (!sanitizedContent) {
      return '';
    }
    return buildHtml(sanitizedContent);
  }, [sanitizedContent]);

  if (!sanitizedContent) {
    return <span className={className}>—</span>;
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
