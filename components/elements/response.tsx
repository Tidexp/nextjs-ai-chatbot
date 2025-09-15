'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo } from 'react';
import { Streamdown } from 'streamdown';
import { CodeBlock, CodeBlockCopyButton } from './code-block';

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        className,
      )}
      components={{
        code: ({ children, className, ...props }) => {
          // Check if this is a code block (has className with language)
          const match = className?.match(/language-(\w+)/);
          const language = match ? match[1] : undefined;
          
          // If it's a code block (multiline), use CodeBlock component
          if (language && typeof children === 'string' && children.includes('\n')) {
            return (
              <CodeBlock code={children} language={language}>
                <CodeBlockCopyButton />
              </CodeBlock>
            );
          }
          
          // Otherwise, it's inline code
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = 'Response';
