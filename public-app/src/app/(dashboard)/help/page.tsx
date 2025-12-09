'use client';

import React from 'react';
import { helpChapters } from '@/components/help/help-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Κέντρο Βοήθειας</h1>
        <p className="text-muted-foreground">
          Οδηγίες, συμβουλές και απαντήσεις για τη χρήση της εφαρμογής.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {helpChapters.map((chapter) => (
          <Card key={chapter.id} className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <chapter.icon className="w-5 h-5" />
                </div>
                <CardTitle>{chapter.title}</CardTitle>
              </div>
              <CardDescription>{chapter.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                {chapter.sections.map((section, idx) => (
                  <HelpSectionItem key={idx} title={section.title} content={section.content} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HelpSectionItem({ title, content }: { title: string; content: string[] }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="border rounded-md px-3 py-2 bg-muted/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left font-medium text-sm py-1 hover:text-primary transition-colors"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {isOpen && (
        <div className="pt-3 pb-1 text-sm text-muted-foreground space-y-2 border-t mt-2">
          {content.map((paragraph, idx) => (
            <p key={idx} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

