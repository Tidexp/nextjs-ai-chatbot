'use client';

import { useState } from 'react';
import { ExerciseEditor } from './exercise-editor';
import { CodePreview } from './code-preview';

interface ExercisePanelProps {
  title: string;
  description?: string;
  initialCode?: string;
  language?: string;
  readOnly?: boolean;
  testCases?: {
    input?: string;
    expectedOutput: string;
    description: string;
  }[];
  onValidate?: (code: string) => Promise<boolean>;
}

export function ExercisePanel({
  title,
  description,
  initialCode = '',
  language = 'javascript',
  readOnly = false,
  testCases = [],
  onValidate,
}: ExercisePanelProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleRunCode = async (codeToRun: string) => {
    setIsRunning(true);
    try {
      // For JavaScript exercises, run code in preview iframe
      if (language === 'javascript') {
        setCode(codeToRun);
      }

      // Validate against test cases if provided
      if (onValidate) {
        const isValid = await onValidate(codeToRun);
        setOutput(isValid ? 'All tests passed! ✅' : 'Some tests failed ❌');
      }
    } catch (error) {
      setOutput(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-[600px]">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">{title}</h3>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <ExerciseEditor
          starterCode={code}
          language={language}
          onRun={!readOnly ? handleRunCode : undefined}
          onChange={!readOnly ? handleCodeChange : undefined}
          readOnly={readOnly}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <CodePreview code={code} language={language} />
        {output && (
          <div className="p-4 border-t text-sm">
            <div className="font-medium mb-2">Output:</div>
            <pre className="whitespace-pre-wrap">{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}