import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = memo(({ content, className = '' }) => {
  // Pre-process LaTeX delimiters for remark-math compatibility
  let processedContent = content
    ? content
        .replace(/\\\((.*?)\\\)/gs, (_, match) => `$${match}$`)
        .replace(/\\\[(.*?)\\\]/gs, (_, match) => `$$${match}$$`)
    : '';

  // Auto-format markdown tables that are missing the separator row or outer pipes
  if (processedContent) {
    const lines = processedContent.split('\n');
    const result = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      const isTableRow = trimmed.includes('|') && !trimmed.startsWith('$') && !trimmed.startsWith('\\') && trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('>');
      
      if (isTableRow) {
        let tableLines = [];
        let maxPipes = 0;
        let j = i;
        while (j < lines.length) {
          const jTrimmed = lines[j].trim();
          if (jTrimmed.length === 0) break;
          
          const jIsTableRow = jTrimmed.includes('|') && !jTrimmed.startsWith('$') && !jTrimmed.startsWith('\\') && !jTrimmed.startsWith('#') && !jTrimmed.startsWith('>');
          if (!jIsTableRow) break;
          
          let normalized = jTrimmed;
          if (!normalized.startsWith('|')) normalized = '| ' + normalized;
          if (!normalized.endsWith('|')) normalized = normalized + ' |';
          
          const isSep = jTrimmed.split('').every(c => c === '|' || c === '-' || c === ':' || c === ' ');
          tableLines.push({ original: lines[j], normalized, isSep });
          
          const pipeCount = (normalized.match(/\|/g) || []).length;
          if (pipeCount > maxPipes) maxPipes = pipeCount;
          j++;
        }
        
        const hasSeparator = tableLines.length > 1 && tableLines[1].isSep;
        
        if (tableLines.length > 1 || hasSeparator) {
          const colCount = Math.max(1, maxPipes - 1);
          let separator = '|';
          for(let c=0; c<colCount; c++) separator += '---|';
          
          for (let k = 0; k < tableLines.length; k++) {
            let row = tableLines[k].normalized;
            let pCount = (row.match(/\|/g) || []).length;
            while (pCount < maxPipes) {
              row += ' |';
              pCount++;
            }
            result.push(row);
            if (k === 0 && !hasSeparator) {
              result.push(separator);
            }
          }
          result.push(''); // Force a blank line after the table to terminate it
        } else {
          result.push(tableLines[0].original);
        }
        i = j;
      } else {
        result.push(line);
        i++;
      }
    }
    processedContent = result.join('\n');
  }

  return (
    <div className={`prose dark:prose-invert max-w-none text-geist-text-primary-light dark:text-geist-text-primary-dark ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeSanitize, {
            ...defaultSchema,
            attributes: {
              ...defaultSchema.attributes,
              // Only allow className on span/div (needed for KaTeX)
              'span': [...(defaultSchema.attributes?.['span'] || []), 'className', 'style'],
              'div': [...(defaultSchema.attributes?.['div'] || []), 'className', 'style'],
              'img': ['src', 'alt', 'title', 'width', 'height', 'loading'],
            },
            tagNames: [
              ...(defaultSchema.tagNames || []),
              'span', 'div', 'math', 'semantics', 'mrow', 'mi', 'mn',
              'mo', 'msup', 'msub', 'mfrac', 'mover', 'munder',
              'mtable', 'mtr', 'mtd', 'mtext', 'annotation'
            ]
          }],
          rehypeKatex
        ]}
        components={{
          img: ({node, ...props}) => (
            <img {...props} className="max-w-full h-auto rounded-lg my-2" loading="lazy" />
          ),
          table: ({node, ...props}) => (
            <div className="overflow-x-auto my-4">
              <table {...props} className="min-w-full border-collapse border border-geist-border-light dark:border-geist-border-dark" />
            </div>
          ),
          th: ({node, ...props}) => <th {...props} className="border border-geist-border-light dark:border-geist-border-dark px-4 py-2 bg-geist-surface-light dark:bg-geist-surface-dark font-medium text-left" />,
          td: ({node, ...props}) => <td {...props} className="border border-geist-border-light dark:border-geist-border-dark px-4 py-2" />,
          a: ({node, ...props}) => <a {...props} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});
