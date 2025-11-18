'use client';

import { useEffect, useRef, useState } from 'react';

interface CodePreviewProps {
  code: string;
  language?: string;
}

export function CodePreview({ code, language = 'html' }: CodePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    try {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument;
      if (!doc) return;

      let content = '';
      if (language === 'html') {
        content = code;
      } else if (language === 'css') {
        content = `
          <style>${code}</style>
          <div id="preview">
            <!-- Add demo elements for CSS preview -->
            <h1>Heading 1</h1>
            <p>Paragraph text</p>
            <button>Button</button>
          </div>
        `;
      } else if (language === 'javascript') {
        content = `
          <div id="output"></div>
          <script>
            try {
              const log = console.log;
              const output = document.getElementById('output');
              console.log = (...args) => {
                output.innerHTML += args.join(' ') + '<br>';
                log(...args);
              };
              ${code}
            } catch (error) {
              document.getElementById('output').innerHTML = '<span style="color: red;">Error: ' + error.message + '</span>';
            }
          </script>
        `;
      }

      doc.open();
      doc.write(content);
      doc.close();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [code, language]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 bg-muted text-sm font-medium">Preview</div>
      <div className="flex-1 bg-white">
        {error ? (
          <div className="p-4 text-red-500">{error}</div>
        ) : (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
            title="Code Preview"
          />
        )}
      </div>
    </div>
  );
}