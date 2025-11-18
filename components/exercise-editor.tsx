'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

interface ExerciseEditorProps {
  starterCode?: string;
  language?: string;
  onRun?: (code: string) => void;
  onChange?: (code: string) => void;
  readOnly?: boolean;
}

export function ExerciseEditor({
  starterCode = '',
  language = 'javascript',
  onRun,
  onChange,
  readOnly = false,
}: ExerciseEditorProps) {
  const [code, setCode] = useState(starterCode);

  // Keep external code in sync
  useEffect(() => {
    setCode(starterCode);
  }, [starterCode]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      onChange?.(value);
    }
  };

  const handleRunClick = () => {
    onRun?.(code);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 bg-muted">
        <Tabs defaultValue="editor" className="w-[400px]">
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          onClick={handleRunClick}
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={readOnly}
        >
          Run Code
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage={language}
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            readOnly,
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}
