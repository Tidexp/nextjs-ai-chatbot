'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Download, ExternalLink } from 'lucide-react';
import Image from 'next/image';

interface FilePreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    url: string;
    name: string;
    mediaType: string;
  } | null;
}

export function FilePreviewPanel({ isOpen, onClose, file }: FilePreviewPanelProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && file) {
      if (file.mediaType === 'text/plain') {
        setLoading(true);
        setError('');
        fetch(file.url)
          .then(response => response.text())
          .then(text => {
            setContent(text);
            setLoading(false);
          })
          .catch(err => {
            setError('Failed to load file content');
            setLoading(false);
            console.error('Error fetching file:', err);
          });
      } else {
        setContent('');
        setError('');
      }
    }
  }, [isOpen, file]);

  const handleDownload = () => {
    if (!file) return;
    
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    if (!file) return;
    window.open(file.url, '_blank');
  };

  if (!isOpen || !file) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/90 z-40"
        onClick={onClose}
      />
      
      {/* Full-screen modal */}
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {file.mediaType === 'text/plain' ? (
              <div className="size-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400 text-lg font-bold">
                📝
              </div>
            ) : file.mediaType === 'application/pdf' ? (
              <div className="size-10 flex items-center justify-center bg-red-100 dark:bg-red-900/20 rounded text-red-600 dark:text-red-400 text-lg font-bold">
                📄
              </div>
            ) : file.mediaType.startsWith('image/') ? (
              <div className="size-10 flex items-center justify-center bg-green-100 dark:bg-green-900/20 rounded text-green-600 dark:text-green-400 text-lg font-bold">
                🖼️
              </div>
            ) : (
              <div className="size-10 flex items-center justify-center bg-gray-100 dark:bg-gray-900/20 rounded text-gray-600 dark:text-gray-400 text-lg font-bold">
                📁
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate">{file.name}</h3>
              <p className="text-sm text-muted-foreground">{file.mediaType}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="h-9 px-3"
            >
              <Download size={16} className="mr-2" />
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenInNewTab}
              className="h-9 px-3"
            >
              <ExternalLink size={16} className="mr-2" />
              Open
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="size-9 p-0"
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {file.mediaType.startsWith('image/') ? (
            <div className="flex items-center justify-center h-full p-4">
              <Image
                src={file.url}
                alt={file.name}
                width={800}
                height={800}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          ) : file.mediaType === 'text/plain' ? (
            <div className="h-full p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full size-12 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center py-8 text-lg">{error}</div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-6 rounded-lg h-full overflow-auto">
                  {content}
                </pre>
              )}
            </div>
          ) : file.mediaType === 'application/pdf' ? (
            <div className="h-full">
              <iframe
                src={file.url}
                className="size-full border-0"
                title={file.name}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="text-6xl mb-4">📁</div>
              <p className="text-lg mb-4">Preview not available for this file type</p>
              <Button
                size="lg"
                variant="outline"
                onClick={handleOpenInNewTab}
              >
                <ExternalLink size={20} className="mr-2" />
                Open in new tab
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
