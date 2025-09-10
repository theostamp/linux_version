'use client';

import React from 'react';
import Link from 'next/link';

interface EventDescriptionProps {
  description: string;
  className?: string;
}

export default function EventDescription({ description, className = '' }: EventDescriptionProps) {
  // Function to parse markdown-style links and convert them to Next.js Links
  const parseDescription = (text: string) => {
    // Split by lines to preserve formatting
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Check if line contains markdown link pattern [text](url)
      const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      
      if (linkPattern.test(line)) {
        // Reset the regex for execution
        linkPattern.lastIndex = 0;
        
        const parts: (string | JSX.Element)[] = [];
        let lastIndex = 0;
        let match;
        
        while ((match = linkPattern.exec(line)) !== null) {
          // Add text before the link
          if (match.index > lastIndex) {
            parts.push(line.substring(lastIndex, match.index));
          }
          
          const linkText = match[1];
          const linkUrl = match[2];
          
          // Check if it's an internal link
          if (linkUrl.startsWith('http://demo.localhost:3001')) {
            // Convert to relative path for Next.js Link
            const relativePath = linkUrl.replace('http://demo.localhost:3001', '');
            parts.push(
              <Link
                key={`link-${lineIndex}-${match.index}`}
                href={relativePath}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline inline-flex items-center gap-1"
              >
                {linkText}
              </Link>
            );
          } else {
            // External link
            parts.push(
              <a
                key={`link-${lineIndex}-${match.index}`}
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline inline-flex items-center gap-1"
              >
                {linkText}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            );
          }
          
          lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text after the last link
        if (lastIndex < line.length) {
          parts.push(line.substring(lastIndex));
        }
        
        return (
          <div key={`line-${lineIndex}`} className="mb-1">
            {parts}
          </div>
        );
      }
      
      // Handle special formatting
      if (line.startsWith('📊 **')) {
        // Section header
        return (
          <div key={`line-${lineIndex}`} className="font-semibold mt-3 mb-2">
            {line.replace(/\*\*/g, '')}
          </div>
        );
      }
      
      if (line.startsWith('🔗 ')) {
        // Link line with icon
        return (
          <div key={`line-${lineIndex}`} className="ml-4 mb-1">
            {line}
          </div>
        );
      }
      
      // Regular line
      return line ? (
        <div key={`line-${lineIndex}`} className="mb-1">
          {line}
        </div>
      ) : (
        <br key={`br-${lineIndex}`} />
      );
    });
  };
  
  return (
    <div className={`text-sm text-gray-600 dark:text-gray-300 ${className}`}>
      {parseDescription(description)}
    </div>
  );
}