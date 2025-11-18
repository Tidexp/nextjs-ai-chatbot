import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  submitLabel?: string;
  disabled?: boolean;
}

export const ContentEditor = memo(function ContentEditor({
  value,
  onChange,
  onSubmit,
  placeholder = 'Enter your message here...',
  submitLabel = 'Send',
  disabled = false,
}: ContentEditorProps) {
  return (
    <div className="flex flex-col space-y-2 p-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[60px] max-h-[200px] resize-none"
        disabled={disabled}
      />
      <Button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </div>
  );
});
