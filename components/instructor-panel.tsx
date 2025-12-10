'use client';

import React from 'react';
import { toast } from 'sonner';
import { useInstructorMode } from '@/hooks/use-instructor-mode';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SidebarLeftIcon } from '@/components/icons';
import { generateUUID } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';

// Google API configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const GOOGLE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID || '';

// Scopes for Google Drive API
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Declare global gapi and google types
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface SourceItem {
  id: string;
  title: string;
  type: 'markdown' | 'code' | 'pdf' | 'image';
  excerpt: string;
}

interface SourceItemWithContent extends SourceItem {
  content?: string;
  sourceUrl?: string;
  metadata?: any;
}

interface InstructorNote {
  id: string;
  messageId?: string;
  content: string;
  createdAt: string;
  title: string;
}

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeRegExp = (str: string) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const mergeTextWithImages = (baseText: string, images: string[]) => {
  if (images.length === 0) return baseText;
  const paragraphs = baseText.split(/\n{2,}/);
  const result: string[] = [];
  let imageIdx = 0;

  for (const para of paragraphs) {
    if (para && para.trim().length > 0) {
      result.push(para.trimEnd());
    }
    if (imageIdx < images.length) {
      result.push(`--- Image ${imageIdx + 1} (OCR) ---\n${images[imageIdx]}`);
      imageIdx++;
    }
  }

  while (imageIdx < images.length) {
    result.push(`--- Image ${imageIdx + 1} (OCR) ---\n${images[imageIdx]}`);
    imageIdx++;
  }

  return result.join('\n\n').trim();
};

// API helper functions for database operations
const loadSourcesFromAPI = async (): Promise<SourceItemWithContent[]> => {
  try {
    const response = await fetch('/api/instructor-sources');
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Failed to load sources from API:', error);
    return [];
  }
};

const saveSourceToAPI = async (
  source: Omit<SourceItemWithContent, 'id'>,
  options?: {
    skipEmbedding?: boolean;
    onEmbeddingStart?: (id: string) => void;
    onEmbeddingComplete?: (id: string) => void;
  },
) => {
  try {
    const response = await fetch('/api/instructor-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
    });
    if (!response.ok) {
      const txt = await response.text();
      console.error('[Upload] Failed to save source:', response.status, txt);
      throw new Error('Failed to save source');
    }
    const savedSource = await response.json();

    // Generate embeddings async in background if not skipped
    if (!options?.skipEmbedding && savedSource.id && source.content) {
      options?.onEmbeddingStart?.(savedSource.id);

      // Run embedding generation in background (don't await)
      fetch('/api/rag/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: savedSource.id,
          content: source.content,
        }),
      })
        .then(async (embedResponse) => {
          if (embedResponse.ok) {
            const embedData = await embedResponse.json();
            console.log(
              `[InstructorPanel] Successfully generated embeddings: ${embedData.chunksCount} chunks`,
            );
          } else {
            console.warn(
              '[InstructorPanel] Embedding generation failed:',
              embedResponse.status,
            );
          }
        })
        .catch((embedError) => {
          console.warn(
            '[InstructorPanel] Failed to generate embeddings:',
            embedError,
          );
        })
        .finally(() => {
          options?.onEmbeddingComplete?.(savedSource.id);
        });
    }

    return savedSource;
  } catch (error) {
    console.error('Failed to save source to API:', error);
    throw error;
  }
};

const deleteSourceFromAPI = async (sourceId: string) => {
  try {
    const response = await fetch(`/api/instructor-sources?id=${sourceId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const txt = await response.text();
      console.error('Failed to delete source response:', response.status, txt);
      throw new Error('Failed to delete source');
    }
  } catch (error) {
    console.error('Failed to delete source from API:', error);
    throw error;
  }
};

import { InstructorChat } from './instructor-chat';

export function InstructorPanel({
  chatId,
}: {
  chatId?: string;
}) {
  const { setActive } = useInstructorMode();
  const { data: session } = useSession();
  const [sources, setSources] = React.useState<SourceItemWithContent[]>([]);
  const [showSources, setShowSources] = React.useState(true);
  const [showStudio, setShowStudio] = React.useState(true);
  const [showChat, setShowChat] = React.useState(true);
  const [sourcesWidth, setSourcesWidth] = React.useState(320);
  const [studioWidth, setStudioWidth] = React.useState(320);
  const [isResizingSources, setIsResizingSources] = React.useState(false);
  const [isResizingStudio, setIsResizingStudio] = React.useState(false);
  const [dragStartX, setDragStartX] = React.useState(0);
  const [dragStartWidth, setDragStartWidth] = React.useState(0);
  const [notes, setNotes] = React.useState<InstructorNote[]>([]);
  const [notesLoading, setNotesLoading] = React.useState(false);
  const [selectedNote, setSelectedNote] = React.useState<InstructorNote | null>(
    null,
  );
  const instructorChatId = React.useMemo(
    () => chatId || generateUUID(),
    [chatId],
  );
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isGoogleApiLoaded, setIsGoogleApiLoaded] = React.useState(false);
  const [showAddSourceModal, setShowAddSourceModal] = React.useState(false);
  const [showPasteModal, setShowPasteModal] = React.useState(false);
  const [showUrlModal, setShowUrlModal] = React.useState(false);
  const [pasteText, setPasteText] = React.useState('');
  const [urlInput, setUrlInput] = React.useState('');
  const [urlLoading, setUrlLoading] = React.useState(false);
  const [driveSelectionCount, setDriveSelectionCount] = React.useState(0);
  const [loadingSources, setLoadingSources] = React.useState<Set<string>>(
    new Set(),
  );
  const [enabledSources, setEnabledSources] = React.useState<Set<string>>(
    new Set(),
  );
  const [uploadingCount, setUploadingCount] = React.useState(0);
  const [viewerSearch, setViewerSearch] = React.useState('');
  const [viewerMatchIndex, setViewerMatchIndex] = React.useState(0);
  const [viewingSource, setViewingSource] =
    React.useState<SourceItemWithContent | null>(null);
  const viewerContentRef = React.useRef<HTMLDivElement | null>(null);
  const [noteSearch, setNoteSearch] = React.useState('');
  const [noteMatchIndex, setNoteMatchIndex] = React.useState(0);
  const noteContentRef = React.useRef<HTMLDivElement | null>(null);

  // Initialize all sources as enabled when loaded
  React.useEffect(() => {
    if (sources.length > 0) {
      setEnabledSources(new Set(sources.map((s) => s.id)));
    }
  }, [sources.length]);

  // Load sources from database on mount
  React.useEffect(() => {
    loadSourcesFromAPI().then(setSources);
  }, []);

  // Handle resize for sources panel
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSources) {
        const delta = e.clientX - dragStartX;
        const newWidth = dragStartWidth + delta;
        if (newWidth >= 200 && newWidth <= 600) {
          setSourcesWidth(newWidth);
        }
      }
      if (isResizingStudio) {
        const delta = dragStartX - e.clientX;
        const newWidth = dragStartWidth + delta;
        if (newWidth >= 200 && newWidth <= 600) {
          setStudioWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingSources(false);
      setIsResizingStudio(false);
    };

    if (isResizingSources || isResizingStudio) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSources, isResizingStudio, dragStartX, dragStartWidth]);
  // Add pasted text as a source
  const handleAddPastedText = async () => {
    if (pasteText.trim()) {
      try {
        // Create a blob URL for pasted text (stored in browser memory)
        const blob = new Blob([pasteText], { type: 'text/plain' });
        const blobUrl = URL.createObjectURL(blob);

        const newSource = await saveSourceToAPI({
          title: 'Pasted Text',
          type: 'markdown',
          excerpt: pasteText.slice(0, 200).replace(/\s+/g, ' ').trim(),
          sourceUrl: blobUrl,
          metadata: { type: 'pasted' },
          content: pasteText, // Pass content for RAG embedding generation
        });
        setSources((prev) => [newSource, ...prev]);
        setPasteText('');
        setShowPasteModal(false);
      } catch (error) {
        alert('Failed to save pasted text');
      }
    }
  };

  // Add website URL as a source
  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    try {
      const response = await fetch(
        `https://textance.herokuapp.com/title/${encodeURIComponent(urlInput)}`,
      );
      let title = urlInput;
      if (response.ok) {
        title = await response.text();
      }
      const newSource = await saveSourceToAPI({
        title: title || urlInput,
        type: 'markdown',
        excerpt: urlInput,
        sourceUrl: urlInput,
      });
      setSources((prev) => [newSource, ...prev]);
      setUrlInput('');
      setShowUrlModal(false);
    } catch (error) {
      alert('Failed to add URL');
      setShowUrlModal(false);
    } finally {
      setUrlLoading(false);
    }
  };

  const deriveTitle = (content: string) => {
    const firstLine =
      content.split('\n').find((line) => line.trim()) || content;
    return firstLine.trim().slice(0, 120) || 'Saved note';
  };

  const loadNotes = React.useCallback(async () => {
    setNotesLoading(true);
    try {
      const res = await fetch(
        `/api/instructor-notes?chatId=${instructorChatId}`,
      );
      if (res.status === 404) {
        setNotes([]);
        return;
      }
      if (!res.ok) throw new Error('Failed to load notes');
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Failed to load notes', error);
      toast.error('Could not load notes');
    } finally {
      setNotesLoading(false);
    }
  }, [instructorChatId]);

  React.useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleStoreNote = React.useCallback(
    async (message: ChatMessage) => {
      const textFromParts =
        message.parts
          ?.filter((part: any) => part.type === 'text' && part.text?.trim())
          .map((part: any) => part.text.trim())
          .join('\n')
          .trim() || '';

      if (!textFromParts) {
        toast.error('No text found to save as a note.');
        return;
      }

      try {
        const payload = {
          chatId: instructorChatId,
          title: deriveTitle(textFromParts),
          content: textFromParts,
        };
        const res = await fetch('/api/instructor-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to save note');
        const data = await res.json();
        setNotes((prev) => [data.note, ...prev]);
        toast.success('Saved to Studio notes.');
      } catch (error) {
        console.error('Failed to save note', error);
        toast.error('Failed to save note.');
      }
    },
    [deriveTitle, instructorChatId],
  );

  const handleRemoveNote = React.useCallback(
    async (noteId: string) => {
      try {
        const res = await fetch(
          `/api/instructor-notes?id=${noteId}&chatId=${instructorChatId}`,
          {
            method: 'DELETE',
          },
        );
        if (!res.ok) throw new Error('Failed to remove note');
        setNotes((prev) => prev.filter((note) => note.id !== noteId));
      } catch (error) {
        console.error('Failed to remove note', error);
        toast.error('Failed to remove note.');
      }
    },
    [instructorChatId],
  );

  const handleCopyNote = React.useCallback(async (note: InstructorNote) => {
    try {
      await navigator.clipboard.writeText(note.content);
      toast.success('Copied note to clipboard.');
    } catch (error) {
      console.error('Failed to copy note', error);
      toast.error('Failed to copy note.');
    }
  }, []);

  function detectType(file: File): SourceItem['type'] {
    const mt = file.type;
    if (mt.startsWith('image/')) return 'image';
    if (mt === 'application/pdf') return 'pdf';
    if (
      mt.includes('javascript') ||
      file.name.endsWith('.ts') ||
      file.name.endsWith('.js')
    )
      return 'code';
    if (
      mt.startsWith('text/') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt')
    )
      return 'markdown';
    return 'markdown';
  }

  async function readFileContent(file: File): Promise<string> {
    console.log(
      `[readFileContent] Called for: ${file.name}, type: ${file.type}, size: ${file.size}`,
    );
    try {
      // Image files - extract text via OCR
      if (file.type.startsWith('image/')) {
        console.log(`[Image] Processing ${file.name} with OCR...`);
        try {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              '',
            ),
          );

          const ocrResponse = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64 }),
          });

          if (ocrResponse.ok) {
            const { text, language } = await ocrResponse.json();
            console.log(
              `[Image] OCR extracted ${text.length} chars${language ? ` (${language})` : ''}`,
            );
            return text || '[No text found in image]';
          }
          console.error('[Image] OCR failed:', await ocrResponse.text());
          return '[OCR processing failed]';
        } catch (ocrError) {
          console.error('[Image] OCR error:', ocrError);
          return '[OCR error - could not extract text]';
        }
      }

      if (
        file.type.startsWith('text/') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.ts') ||
        file.name.endsWith('.js')
      ) {
        return await file.text();
      }
      // DOCX parsing via mammoth (browser compatible)
      if (file.name.toLowerCase().endsWith('.docx')) {
        console.log(
          `[DOCX] Processing file: ${file.name}, size: ${file.size} bytes`,
        );
        try {
          const arrayBuffer = await file.arrayBuffer();
          console.log(
            `[DOCX] ArrayBuffer loaded: ${arrayBuffer.byteLength} bytes`,
          );

          const mammoth = await import('mammoth');
          console.log('[DOCX] Mammoth library loaded');

          // Extract text with mammoth (handles DOCX structure properly)
          console.log('[DOCX] Starting mammoth text extraction...');
          const textResult = await mammoth.extractRawText({ arrayBuffer });
          console.log('[DOCX] Mammoth extraction complete');

          const fullText = textResult.value || '';

          console.log(
            `[DOCX] Mammoth extracted ${fullText.length} chars from ${file.name}`,
          );
          console.log(`[DOCX] First 500 chars: ${fullText.substring(0, 500)}`);
          console.log(`[DOCX] Messages/warnings:`, textResult.messages);

          // If very little text extracted, file likely contains images with text
          if (fullText.length < 100) {
            console.log(
              '[DOCX] Little text found - file may contain images. Extracting images for OCR...',
            );
          }

          // Extract images and run OCR on them
          console.log('[DOCX] Extracting images for OCR...');
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(arrayBuffer);

          // List all files in DOCX for debugging
          const allFiles = Object.keys(zip.files);
          console.log(`[DOCX] Total files in DOCX: ${allFiles.length}`);
          console.log(
            `[DOCX] Files:`,
            allFiles.filter((f) => f.includes('media') || f.includes('image')),
          );

          // Look for images in multiple possible locations with flexible naming
          const imageFiles = allFiles
            .filter(
              (name) =>
                /\.(png|jpg|jpeg|gif|bmp|tiff|webp)$/i.test(name) &&
                (name.includes('media') || name.includes('image')),
            )
            .sort(); // sort for stable, approximate document order

          console.log(`[DOCX] Found ${imageFiles.length} image files`);
          if (imageFiles.length > 0) {
            console.log(`[DOCX] Found ${imageFiles.length} embedded images`);
            const imageTexts: string[] = [];

            for (let i = 0; i < imageFiles.length; i++) {
              const imgFile = imageFiles[i];
              try {
                const imgData = await zip.file(imgFile)?.async('base64');
                if (imgData) {
                  console.log(
                    `[DOCX] Running OCR on image ${i + 1}/${imageFiles.length}...`,
                  );
                  const ocrResponse = await fetch('/api/ocr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: imgData }),
                  });

                  if (ocrResponse.ok) {
                    const { text } = await ocrResponse.json();
                    if (text && text.trim().length > 0) {
                      imageTexts.push(text);
                      console.log(
                        `[DOCX] Extracted ${text.length} chars from image ${i + 1}`,
                      );
                    }
                  } else {
                    console.error(
                      `[DOCX] OCR failed for image ${i + 1}:`,
                      ocrResponse.status,
                      await ocrResponse.text(),
                    );
                  }
                }
              } catch (imgError) {
                console.error(
                  `[DOCX] Failed to process image ${i + 1}:`,
                  imgError,
                );
              }
            }

            if (imageTexts.length > 0) {
              const merged = mergeTextWithImages(fullText, imageTexts);
              console.log(
                `[DOCX] Merged text + OCR length: ${merged.length} (text: ${fullText.length}, OCR: ${merged.length - fullText.length})`,
              );
              return merged || '[No text extracted from DOCX]';
            }
          }

          return fullText || '[No text extracted from DOCX]';
        } catch (err) {
          console.error('[DOCX] Failed to parse DOCX:', err);
          console.error(
            '[DOCX] Error stack:',
            err instanceof Error ? err.stack : 'No stack trace',
          );
          return ''; // Return empty string on error
        }
      }
      // XLSX parsing via xlsx (SheetJS) — flatten all sheets to plain text
      if (
        file.name.toLowerCase().endsWith('.xlsx') ||
        file.type ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const XLSX = await import('xlsx');
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetNames = wb.SheetNames;
          const parts: string[] = [];

          for (const sheetName of sheetNames) {
            const sheet = wb.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, {
              header: 1,
            }) as unknown as Array<Array<string | number | null>>;
            parts.push(`# Sheet: ${sheetName}`);
            for (const row of rows) {
              parts.push(
                (row || [])
                  .map((v) => (v === null || v === undefined ? '' : String(v)))
                  .join('\t'),
              );
            }
            parts.push('');
          }
          return parts.join('\n');
        } catch (err) {
          console.error('Failed to parse XLSX', err);
        }
      }
      // PDF parsing via pdfjs-dist — extract text content page by page
      if (file.name.toLowerCase().endsWith('.pdf')) {
        try {
          console.log(`[PDF] Reading ${file.name} (${file.size} bytes)`);
          const arrayBuffer = await file.arrayBuffer();
          const pdfjsLib = await import('pdfjs-dist');

          // Set worker source to use the bundled worker from pdfjs-dist
          // The worker file is served from the public directory
          // @ts-ignore
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

          // @ts-ignore
          const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
          });
          const pdf = await loadingTask.promise;
          console.log(`[PDF] Loaded PDF with ${pdf.numPages} pages`);
          const texts: string[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            console.log(`[PDF] Processing page ${i}/${pdf.numPages}`);
            const content = await page.getTextContent();
            const pageText = content.items
              .map((item: any) =>
                typeof item.str === 'string' ? item.str : '',
              )
              .filter(Boolean)
              .join(' ');

            // OCR fallback for scanned pages (minimal text extracted)
            if (pageText.trim().length < 50) {
              console.log(
                `[PDF] Page ${i} has minimal text (${pageText.length} chars), running OCR...`,
              );
              try {
                // Render page as image
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (context) {
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;

                  await page.render({ canvasContext: context, viewport })
                    .promise;
                  const imageData = canvas.toDataURL('image/png');
                  const base64Data = imageData.split(',')[1];

                  // Call OCR API
                  const ocrResponse = await fetch('/api/ocr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64Data }),
                  });

                  if (ocrResponse.ok) {
                    const { text: ocrText } = await ocrResponse.json();
                    console.log(
                      `[PDF] OCR extracted ${ocrText.length} chars from page ${i}`,
                    );
                    texts.push(`\n\n--- Page ${i} (OCR) ---\n${ocrText}`);
                  } else {
                    console.error(
                      `[PDF] OCR failed for page ${i}:`,
                      await ocrResponse.text(),
                    );
                    texts.push(
                      `\n\n--- Page ${i} ---\n${pageText || '[No text extracted]'}`,
                    );
                  }
                } else {
                  texts.push(`\n\n--- Page ${i} ---\n${pageText}`);
                }
              } catch (ocrError) {
                console.error(`[PDF] OCR error on page ${i}:`, ocrError);
                texts.push(`\n\n--- Page ${i} ---\n${pageText}`);
              }
            } else {
              texts.push(`\n\n--- Page ${i} ---\n${pageText}`);
            }
          }
          const combined = texts.join('\n');
          console.log(`[PDF] Combined text length: ${combined.length}`);
          if (combined.trim().length === 0) {
            return '[No text extracted from PDF pages]';
          }
          return combined;
        } catch (err) {
          console.error('Failed to parse PDF', err);
        }
      }
    } catch {}
    return '';
  }

  const onAddSourceClick = () => {
    setShowAddSourceModal(true);
  };

  const onAddLocalFileClick = () => {
    setShowAddSourceModal(false);
    fileInputRef.current?.click();
  };

  const onAddGoogleDriveClick = () => {
    setShowAddSourceModal(false);
    openGooglePicker();
  };

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    for (const f of files) {
      const type = detectType(f);
      const tempId = `upload-${f.name}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const tempSource: SourceItemWithContent = {
        id: tempId,
        title: f.name,
        type,
        excerpt: 'Preparing file for upload...'
          .slice(0, 200)
          .replace(/\s+/g, ' ')
          .trim(),
        metadata: { fileName: f.name, fileSize: f.size, fileType: f.type },
      };

      setLoadingSources((prev) => new Set(prev).add(tempId));
      setSources((prev) => [tempSource, ...prev]);
      setUploadingCount((prev) => prev + 1);
      let replaced = false;

      try {
        console.log(
          `[Upload] Processing file: ${f.name} (${f.type}, ${f.size} bytes)`,
        );
        const content = await readFileContent(f);
        console.log(
          `[Upload] readFileContent done for ${f.name}, length: ${content?.length || 0}`,
        );

        if (!content || content.trim().length === 0) {
          toast.error(`No text extracted from ${f.name}. Skipping embedding.`);
          console.warn(`[Upload] No text extracted from ${f.name}; skipping.`);
          continue;
        }

        const excerpt = content.slice(0, 200).replace(/\s+/g, ' ').trim();

        // Create a blob URL for the file (stored in browser memory)
        const blob = new Blob([content], { type: f.type });
        const blobUrl = URL.createObjectURL(blob);

        const savedSource = await saveSourceToAPI(
          {
            title: f.name,
            type,
            excerpt: excerpt || `${type.toUpperCase()} file`,
            sourceUrl: blobUrl,
            metadata: { fileName: f.name, fileSize: f.size, fileType: f.type },
            content, // Pass content for RAG embedding generation
          },
          {
            onEmbeddingStart: (id) => {
              setLoadingSources((prev) => new Set(prev).add(id));
              console.log(`[Upload] Starting embedding for ${f.name} (${id})`);
            },
            onEmbeddingComplete: (id) => {
              console.log(`[Upload] Embedding finished for ${f.name} (${id})`);
              setLoadingSources((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            },
          },
        );
        console.log(`[Upload] Saved source ${savedSource.id} for ${f.name}`);
        // Replace placeholder with saved source so user sees progress immediately
        setSources((prev) =>
          prev.map((s) => (s.id === tempId ? savedSource : s)),
        );
        replaced = true;
        setLoadingSources((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
      } catch (error) {
        console.error(`Failed to upload ${f.name}:`, error);
      } finally {
        setUploadingCount((prev) => Math.max(0, prev - 1));
        if (!replaced) {
          setSources((prev) => prev.filter((s) => s.id !== tempId));
        }
        setLoadingSources((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
      }
    }

    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Initialize Google API (Picker only, auth happens on-demand)
  React.useEffect(() => {
    const initGoogleApi = () => {
      if (typeof window !== 'undefined' && window.gapi) {
        window.gapi.load('picker', () => {
          setIsGoogleApiLoaded(true);
        });
      }
    };

    // Wait for the scripts to load
    if (window.gapi) {
      initGoogleApi();
    } else {
      const checkGapi = setInterval(() => {
        if (window.gapi) {
          initGoogleApi();
          clearInterval(checkGapi);
        }
      }, 100);
      return () => clearInterval(checkGapi);
    }
  }, []);

  // Handle Google Picker callback
  const handlePickerCallback = async (data: any) => {
    // Track selection changes
    if (data.action === window.google.picker.Action.LOADED) {
      setDriveSelectionCount(0);
    }

    if (data.action === window.google.picker.Action.CANCEL) {
      setDriveSelectionCount(0);
    }

    if (data.docs && data.docs.length > 0) {
      setDriveSelectionCount(data.docs.length);
    }

    if (data.action === window.google.picker.Action.PICKED) {
      const items: SourceItemWithContent[] = [];
      setDriveSelectionCount(data.docs.length);

      for (const doc of data.docs) {
        let type: SourceItemWithContent['type'] = 'markdown';
        const mimeType = doc.mimeType;

        // Determine type based on MIME type
        if (mimeType.startsWith('image/')) {
          type = 'image';
        } else if (mimeType === 'application/pdf') {
          type = 'pdf';
        } else if (
          mimeType.includes('javascript') ||
          mimeType.includes('typescript') ||
          doc.name.endsWith('.ts') ||
          doc.name.endsWith('.js')
        ) {
          type = 'code';
        }

        const tempId = `drive-upload-${doc.id}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const tempSource: SourceItemWithContent = {
          id: tempId,
          title: doc.name,
          type,
          excerpt: 'Fetching from Google Drive...'
            .slice(0, 200)
            .replace(/\s+/g, ' ')
            .trim(),
          metadata: { driveId: doc.id, mimeType },
        };

        setUploadingCount((prev) => prev + 1);
        setLoadingSources((prev) => new Set(prev).add(tempId));
        setSources((prev) => [tempSource, ...prev]);
        let replaced = false;

        // Fetch file content for all text-based files
        let content = '';
        let exportUrl = `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`;

        // Handle Google Docs/Sheets/Slides - export as plain text or markdown
        if (mimeType === 'application/vnd.google-apps.document') {
          exportUrl = `https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=text/plain`;
          type = 'markdown';
        } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
          exportUrl = `https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=text/csv`;
          type = 'code';
        } else if (mimeType === 'application/vnd.google-apps.presentation') {
          exportUrl = `https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=text/plain`;
          type = 'markdown';
        }

        // Fetch full content for RAG embedding (for text-based files, PDFs, and images)
        let excerpt = `${type.toUpperCase()} from Google Drive`;
        if (type === 'image') {
          // For images, fetch and run OCR
          try {
            console.log(`[Google Drive] Processing image: ${doc.name}`);
            const response = await fetch(exportUrl, {
              headers: {
                Authorization: `Bearer ${session?.accessToken}`,
              },
            });

            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce(
                  (data, byte) => data + String.fromCharCode(byte),
                  '',
                ),
              );

              console.log(`[Google Drive] Running OCR on ${doc.name}...`);
              const ocrResponse = await fetch('/api/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64 }),
              });

              if (ocrResponse.ok) {
                const { text, language } = await ocrResponse.json();
                content = text || '[No text found in image]';
                excerpt = content.slice(0, 200).replace(/\s+/g, ' ').trim();
                console.log(
                  `[Google Drive] OCR extracted ${text.length} chars from ${doc.name}${language ? ` (${language})` : ''}`,
                );
              } else {
                console.error(
                  '[Google Drive] OCR failed:',
                  ocrResponse.status,
                  await ocrResponse.text(),
                );
                content = '[OCR processing failed]';
                excerpt = 'OCR failed';
              }
            } else {
              console.error(
                `[Google Drive] Failed to fetch image: ${response.status}`,
              );
              content = '[Failed to fetch image]';
              excerpt = 'Fetch failed';
            }
          } catch (error) {
            console.error('[Google Drive] Image OCR error:', error);
            content = '[Image OCR error]';
            excerpt = 'OCR error';
          }
        } else {
          try {
            const response = await fetch(exportUrl, {
              headers: {
                Authorization: `Bearer ${session?.accessToken}`,
              },
            });
            if (response.ok) {
              if (type === 'pdf') {
                // For PDFs, send to server-side parser
                const arrayBuffer = await response.arrayBuffer();
                try {
                  const formData = new FormData();
                  const pdfBlob = new Blob([arrayBuffer], {
                    type: 'application/pdf',
                  });
                  formData.append('file', pdfBlob, 'document.pdf');

                  const parseResponse = await fetch('/api/parse-pdf', {
                    method: 'POST',
                    body: formData,
                  });

                  if (parseResponse.ok) {
                    const { text, pages } = await parseResponse.json();
                    content = text || '[No text extracted from PDF]';
                    excerpt = text.slice(0, 200).replace(/\s+/g, ' ').trim();
                    console.log(
                      `[Google Drive] Extracted ${text.length} chars from PDF ${doc.name} (${pages} pages)`,
                    );
                  } else {
                    console.error(
                      '[Google Drive] PDF parsing failed:',
                      await parseResponse.text(),
                    );
                    content = '[Failed to parse PDF]';
                    excerpt = 'PDF parsing failed';
                  }
                } catch (pdfError) {
                  console.error('[Google Drive] PDF parsing error:', pdfError);
                  content = '[PDF parsing error]';
                  excerpt = 'PDF parsing error';
                }
              } else if (
                doc.name.toLowerCase().endsWith('.docx') ||
                mimeType ===
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              ) {
                // For DOCX, parse with mammoth and extract images for OCR
                console.log(`[Google Drive] Processing DOCX: ${doc.name}`);
                const arrayBuffer = await response.arrayBuffer();
                try {
                  const mammoth = await import('mammoth');
                  const textResult = await mammoth.extractRawText({
                    arrayBuffer,
                  });
                  let fullText = textResult.value || '';

                  console.log(
                    `[Google Drive] Mammoth extracted ${fullText.length} chars from DOCX ${doc.name}`,
                  );

                  // Extract images and run OCR on them
                  console.log('[Google Drive] Extracting images for OCR...');
                  const JSZip = (await import('jszip')).default;
                  const zip = await JSZip.loadAsync(arrayBuffer);

                  // List all files for debugging
                  const allFiles = Object.keys(zip.files);
                  console.log(
                    `[Google Drive] Total files in DOCX: ${allFiles.length}`,
                  );
                  console.log(
                    `[Google Drive] Files:`,
                    allFiles.filter(
                      (f) => f.includes('media') || f.includes('image'),
                    ),
                  );

                  // Look for images with flexible naming
                  const imageFiles = allFiles
                    .filter(
                      (name) =>
                        /\.(png|jpg|jpeg|gif|bmp|tiff|webp)$/i.test(name) &&
                        (name.includes('media') || name.includes('image')),
                    )
                    .sort(); // sort for stable, approximate document order

                  console.log(
                    `[Google Drive] Found ${imageFiles.length} image files`,
                  );
                  if (imageFiles.length > 0) {
                    const imageTexts: string[] = [];

                    for (let i = 0; i < imageFiles.length; i++) {
                      const imgFile = imageFiles[i];
                      try {
                        const imgData = await zip
                          .file(imgFile)
                          ?.async('base64');
                        if (imgData) {
                          console.log(
                            `[Google Drive] Running OCR on image ${i + 1}/${imageFiles.length}...`,
                          );
                          const ocrResponse = await fetch('/api/ocr', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ imageBase64: imgData }),
                          });

                          if (ocrResponse.ok) {
                            const { text } = await ocrResponse.json();
                            if (text && text.trim().length > 0) {
                              imageTexts.push(text);
                              console.log(
                                `[Google Drive] Extracted ${text.length} chars from image ${i + 1}`,
                              );
                            }
                          } else {
                            console.error(
                              `[Google Drive] OCR failed for image ${i + 1}:`,
                              ocrResponse.status,
                              await ocrResponse.text(),
                            );
                          }
                        }
                      } catch (imgError) {
                        console.error(
                          `[Google Drive] Failed to process image ${i + 1}:`,
                          imgError,
                        );
                      }
                    }

                    // Interleave image text with document text to keep natural order
                    if (imageTexts.length > 0) {
                      const merged = mergeTextWithImages(fullText, imageTexts);
                      console.log(
                        `[Google Drive] Merged text + OCR length: ${merged.length} (text: ${fullText.length}, OCR: ${merged.length - fullText.length})`,
                      );
                      fullText = merged;
                    }
                  }

                  content = fullText || '[No text extracted from DOCX]';
                  excerpt = content.slice(0, 200).replace(/\s+/g, ' ').trim();
                  console.log(
                    `[Google Drive] Final content: ${content.length} chars from ${doc.name}`,
                  );
                  console.log(
                    `[Google Drive] DOCX Preview: ${content.substring(0, 300)}`,
                  );
                } catch (docxError) {
                  console.error(
                    '[Google Drive] DOCX parsing error:',
                    docxError,
                  );
                  content = '[DOCX parsing error]';
                  excerpt = 'DOCX parsing error';
                }
              } else {
                // Text-based files
                const fullContent = await response.text();
                content = fullContent; // Store full content for RAG
                excerpt = fullContent.slice(0, 200).replace(/\s+/g, ' ').trim();
                console.log(
                  `[Google Drive] Fetched ${fullContent.length} chars from ${doc.name}`,
                );
              }
            } else if (response.status === 403) {
              console.error(
                'Google Drive API 403 error. The OAuth token may not have sufficient permissions.',
              );
              excerpt = 'Preview unavailable - permission denied';
              content = '';
            } else {
              console.error(`Google Drive API error: ${response.status}`);
              excerpt = 'Preview unavailable';
              content = '';
            }
          } catch (error) {
            console.error('Error fetching content from Google Drive:', error);
            content = '';
          }
        }

        // Store Google Drive file reference with full content for RAG
        const driveFileUrl = `https://drive.google.com/file/d/${doc.id}/view`;

        console.log(
          `[Google Drive] Saving to DB - content length: ${content.length} chars`,
        );
        console.log(
          `[Google Drive] Content preview (first 200 chars): ${content.substring(0, 200)}`,
        );
        console.log(
          `[Google Drive] Content preview (last 200 chars): ${content.substring(content.length - 200)}`,
        );

        try {
          const savedSource = await saveSourceToAPI(
            {
              title: doc.name,
              type,
              excerpt,
              sourceUrl: driveFileUrl,
              content, // Pass full content for RAG embedding generation
              metadata: {
                driveId: doc.id,
                mimeType: doc.mimeType,
                exportUrl,
              },
            },
            {
              onEmbeddingStart: (id) => {
                setLoadingSources((prev) => new Set(prev).add(id));
              },
              onEmbeddingComplete: (id) => {
                setLoadingSources((prev) => {
                  const next = new Set(prev);
                  next.delete(id);
                  return next;
                });
              },
            },
          );
          items.push(savedSource);
          // Replace placeholder with saved source so user sees progress immediately
          setSources((prev) =>
            prev.map((s) => (s.id === tempId ? savedSource : s)),
          );
          replaced = true;
          setLoadingSources((prev) => {
            const next = new Set(prev);
            next.delete(tempId);
            return next;
          });
        } catch (error) {
          console.error(`Failed to save ${doc.name}:`, error);
        } finally {
          setUploadingCount((prev) => Math.max(0, prev - 1));
          if (!replaced) {
            setSources((prev) => prev.filter((s) => s.id !== tempId));
          }
          setLoadingSources((prev) => {
            const next = new Set(prev);
            next.delete(tempId);
            return next;
          });
        }
      }

      setDriveSelectionCount(0);
    }
  };

  // Open Google Picker with OAuth using Google Identity Services
  const openGooglePicker = () => {
    if (!isGoogleApiLoaded) {
      alert('Google API is not ready yet. Please try again in a moment.');
      return;
    }

    // Apply custom styling to Google Picker
    const applyPickerStyles = () => {
      const style = document.createElement('style');
      style.innerHTML = `
        /* Soften Google Picker modal */
        .picker-dialog {
          border-radius: 24px !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid rgba(0, 0, 0, 0.08) !important;
          background: var(--background, #ffffff) !important;
        }
        
        .picker-dialog-inner {
          border-radius: 24px !important;
        }
        
        .picker-header {
          border-radius: 24px 24px 0 0 !important;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%) !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
        }
        
        .picker-header-content {
          padding: 20px 24px !important;
        }
        
        .picker-header-title {
          font-size: 18px !important;
          font-weight: 600 !important;
          letter-spacing: -0.3px !important;
        }
        
        .picker-header-button {
          border-radius: 10px !important;
          background: rgba(0, 0, 0, 0.05) !important;
          border: none !important;
          transition: all 0.2s ease !important;
        }
        
        .picker-header-button:hover {
          background: rgba(0, 0, 0, 0.1) !important;
        }
        
        .picker-content {
          border-radius: 0 0 24px 24px !important;
          background: var(--background, #ffffff) !important;
        }
        
        .picker-footer {
          border-radius: 0 0 24px 24px !important;
          border-top: 1px solid rgba(0, 0, 0, 0.06) !important;
          background: rgba(0, 0, 0, 0.02) !important;
          padding: 16px 24px !important;
        }
        
        .picker-footer-button {
          border-radius: 10px !important;
          border: none !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
        }
        
        .picker-footer-button:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
        }
        
        /* Smooth tab styling */
        .picker-view-selector {
          border-radius: 12px !important;
          margin: 8px !important;
        }
        
        .picker-view-selector-item {
          border-radius: 10px !important;
          margin: 4px !important;
          transition: all 0.2s ease !important;
        }
        
        .picker-view-selector-item.selected {
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%) !important;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2) !important;
        }
        
        /* File list smoothness */
        .picker-navpane-div {
          border-radius: 12px !important;
          border: 1px solid rgba(0, 0, 0, 0.06) !important;
          margin: 12px !important;
        }
        
        .picker-navpane-item {
          border-radius: 8px !important;
          margin: 4px 8px !important;
          transition: all 0.15s ease !important;
        }
        
        .picker-navpane-item:hover {
          background: rgba(0, 0, 0, 0.04) !important;
        }
        
        .picker-navpane-item.selected {
          background: rgba(59, 130, 246, 0.1) !important;
          border-left: 3px solid #3b82f6 !important;
        }
        
        /* Main content area */
        .picker-main-container {
          border-radius: 12px !important;
          margin: 12px !important;
        }
        
        .picker-main-content {
          border-radius: 12px !important;
        }
        
        /* File items in grid */
        .picker-gridview-item {
          border-radius: 12px !important;
          border: 1px solid rgba(0, 0, 0, 0.06) !important;
          margin: 8px !important;
          transition: all 0.2s ease !important;
        }
        
        .picker-gridview-item:hover {
          border-color: rgba(59, 130, 246, 0.3) !important;
          background: rgba(59, 130, 246, 0.02) !important;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1) !important;
        }
        
        .picker-gridview-item.selected {
          border-color: #3b82f6 !important;
          background: rgba(59, 130, 246, 0.05) !important;
          box-shadow: 0 2px 12px rgba(59, 130, 246, 0.15) !important;
        }
        
        /* List view items */
        .picker-listview-item {
          border-radius: 10px !important;
          margin: 4px 8px !important;
          border: 1px solid transparent !important;
          transition: all 0.15s ease !important;
        }
        
        .picker-listview-item:hover {
          border-color: rgba(59, 130, 246, 0.2) !important;
          background: rgba(59, 130, 246, 0.02) !important;
        }
        
        .picker-listview-item.selected {
          border-color: #3b82f6 !important;
          background: rgba(59, 130, 246, 0.08) !important;
        }
        
        /* Input fields */
        .picker-search-input {
          border-radius: 12px !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          margin: 12px !important;
          padding: 12px 16px !important;
          font-size: 14px !important;
          transition: all 0.2s ease !important;
        }
        
        .picker-search-input:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
          outline: none !important;
        }
        
        /* Scrollbars */
        .picker-scrollbar {
          border-radius: 8px !important;
        }
        
        /* Checkboxes for multi-select */
        .picker-checkbox {
          border-radius: 6px !important;
          border: 2px solid rgba(0, 0, 0, 0.2) !important;
          transition: all 0.15s ease !important;
        }
        
        .picker-checkbox:hover {
          border-color: #3b82f6 !important;
        }
        
        .picker-checkbox.checked {
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%) !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2) !important;
        }
      `;
      document.head.appendChild(style);
    };

    applyPickerStyles();

    // Use the access token from the current session (from Google OAuth login)
    // This ensures the picker uses the same Google account the user is logged in with
    if (!session?.accessToken) {
      console.error('[GooglePicker] No access token in session');
      toast.error('Not authenticated with Google. Please sign in again.');
      return;
    }

    // Open picker directly with session's Google access token
    // No account picker needed - uses the logged-in account
    const picker = new window.google.picker.PickerBuilder()
      .addView(window.google.picker.ViewId.DOCS)
      .addView(window.google.picker.ViewId.DOCS_IMAGES)
      .setOAuthToken(session.accessToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setAppId(GOOGLE_APP_ID)
      .setCallback(handlePickerCallback)
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .build();

    picker.setVisible(true);
  };

  const viewerContent = viewingSource?.content || '';

  const viewerHighlight = React.useMemo(() => {
    if (!viewerContent) {
      return { html: escapeHtml('No content available'), count: 0 };
    }
    if (!viewerSearch.trim()) {
      return { html: escapeHtml(viewerContent), count: 0 };
    }

    const regex = new RegExp(escapeRegExp(viewerSearch.trim()), 'gi');
    let hitIndex = 0;
    const html = escapeHtml(viewerContent).replace(regex, (match) => {
      const marked = `<mark data-hit="${hitIndex}" class="bg-yellow-200 dark:bg-yellow-700 text-foreground px-0.5 rounded-sm">${match}</mark>`;
      hitIndex += 1;
      return marked;
    });

    return { html, count: hitIndex };
  }, [viewerContent, viewerSearch]);

  React.useEffect(() => {
    setViewerMatchIndex(0);
  }, [viewerSearch, viewingSource?.id]);

  React.useEffect(() => {
    if (!viewingSource) {
      setViewerSearch('');
      setViewerMatchIndex(0);
    }
  }, [viewingSource?.id]);

  React.useEffect(() => {
    if (!viewingSource || viewerHighlight.count === 0) return;
    const target = viewerContentRef.current?.querySelector<HTMLElement>(
      `mark[data-hit="${viewerMatchIndex}"]`,
    );
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [viewerHighlight, viewerMatchIndex, viewingSource?.id]);

  const hasViewerMatches = viewerHighlight.count > 0;
  const closeViewer = () => {
    setViewingSource(null);
    setViewerSearch('');
    setViewerMatchIndex(0);
  };
  const goToNextMatch = () => {
    if (!hasViewerMatches) return;
    setViewerMatchIndex((prev) => (prev + 1) % viewerHighlight.count);
  };
  const goToPrevMatch = () => {
    if (!hasViewerMatches) return;
    setViewerMatchIndex((prev) =>
      prev - 1 < 0 ? viewerHighlight.count - 1 : prev - 1,
    );
  };

  const noteContent = selectedNote?.content || '';

  const noteHighlight = React.useMemo(() => {
    if (!noteContent) {
      return { html: escapeHtml('No content available'), count: 0 };
    }
    if (!noteSearch.trim()) {
      return { html: escapeHtml(noteContent), count: 0 };
    }

    const regex = new RegExp(escapeRegExp(noteSearch.trim()), 'gi');
    let hitIndex = 0;
    const html = escapeHtml(noteContent).replace(regex, (match) => {
      const marked = `<mark data-hit="${hitIndex}" class="bg-yellow-200 dark:bg-yellow-700 text-foreground px-0.5 rounded-sm">${match}</mark>`;
      hitIndex += 1;
      return marked;
    });

    return { html, count: hitIndex };
  }, [noteContent, noteSearch]);

  React.useEffect(() => {
    setNoteMatchIndex(0);
  }, [noteSearch, selectedNote?.id]);

  React.useEffect(() => {
    if (!selectedNote) {
      setNoteSearch('');
      setNoteMatchIndex(0);
    }
  }, [selectedNote?.id]);

  React.useEffect(() => {
    if (!selectedNote || noteHighlight.count === 0) return;
    const target = noteContentRef.current?.querySelector<HTMLElement>(
      `mark[data-hit="${noteMatchIndex}"]`,
    );
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [noteHighlight, noteMatchIndex, selectedNote?.id]);

  const hasNoteMatches = noteHighlight.count > 0;
  const goToNextNoteMatch = () => {
    if (!hasNoteMatches) return;
    setNoteMatchIndex((prev) => (prev + 1) % noteHighlight.count);
  };
  const goToPrevNoteMatch = () => {
    if (!hasNoteMatches) return;
    setNoteMatchIndex((prev) =>
      prev - 1 < 0 ? noteHighlight.count - 1 : prev - 1,
    );
  };

  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className="text-lg font-semibold">Instructor Mode</h1>
        <Button
          variant="outline"
          onClick={() => {
            setActive(false);
            window.location.href = '/';
          }}
        >
          Exit
        </Button>
      </div>
      {/* Three-column layout: LEFT sources | CENTER conversation | RIGHT studio */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* LEFT: Sources */}
        {showSources && (
          <section
            className="flex-shrink-0 space-y-3 flex flex-col overflow-hidden relative border rounded-md p-3"
            style={{ width: `${sourcesWidth}px` }}
          >
            <div className="flex items-center justify-between flex-shrink-0 gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Sources
                </h2>
                {uploadingCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Uploading {uploadingCount}</span>
                  </div>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSources(false)}
                    className="md:px-2 md:h-fit"
                  >
                    <SidebarLeftIcon size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Collapse Sources</TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-2 flex-1 overflow-auto">
              {sources.map((s) => {
                const isLoading = loadingSources.has(s.id);
                const isEnabled = enabledSources.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={`rounded-md border p-3 transition relative ${
                      isLoading
                        ? 'opacity-60 cursor-not-allowed'
                        : !isEnabled
                          ? 'opacity-50 bg-muted/30'
                          : 'hover:bg-muted'
                    }`}
                  >
                    {isLoading && (
                      <div className="absolute inset-0 rounded-md border-2 border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 px-4">
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden relative">
                            <div
                              className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 animate-[shimmer_2s_ease-in-out_infinite]"
                              style={{
                                backgroundSize: '200% 100%',
                              }}
                            />
                          </div>
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            Processing embeddings...
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 z-20">
                      <label
                        className="flex items-center gap-1.5 cursor-pointer group"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          disabled={isLoading}
                          onChange={(e) => {
                            e.stopPropagation();
                            setEnabledSources((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) {
                                next.add(s.id);
                              } else {
                                next.delete(s.id);
                              }
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded border-2 border-muted-foreground/40 checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-xs text-muted-foreground hover:text-red-500"
                        title="Remove Source"
                        disabled={isLoading}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (isLoading) return;
                          try {
                            await deleteSourceFromAPI(s.id);
                            setSources((prev) =>
                              prev.filter((src) => src.id !== s.id),
                            );
                            setLoadingSources((prev) => {
                              const next = new Set(prev);
                              next.delete(s.id);
                              return next;
                            });
                            setEnabledSources((prev) => {
                              const next = new Set(prev);
                              next.delete(s.id);
                              return next;
                            });
                          } catch (error) {
                            alert('Failed to delete source');
                          }
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                    <div
                      className="cursor-pointer"
                      onClick={(e) => {
                        if (!isLoading) {
                          setViewingSource(s);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!isLoading) {
                            setViewingSource(s);
                          }
                        }
                      }}
                      role="button"
                      tabIndex={isLoading ? -1 : 0}
                    >
                      <div className="flex items-center gap-2 pt-6">
                        {/* File type icon */}
                        {s.type === 'pdf' && (
                          <svg
                            className="w-5 h-5 text-red-500 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" />
                          </svg>
                        )}
                        {s.type === 'code' && (
                          <svg
                            className="w-5 h-5 text-blue-500 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                            />
                          </svg>
                        )}
                        {s.type === 'markdown' && (
                          <svg
                            className="w-5 h-5 text-purple-500 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                          </svg>
                        )}
                        {s.type === 'image' && (
                          <svg
                            className="w-5 h-5 text-green-500 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {s.title}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="secondary" onClick={onAddSourceClick}>
                ➕ Add Source
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={onFilesSelected}
                accept=".md,.txt,.js,.ts,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*,text/*"
              />
              {/* Modal for Add Source options */}
              {showAddSourceModal && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
                  onClick={() => setShowAddSourceModal(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowAddSourceModal(false);
                    }
                  }}
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="bg-background rounded-3xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden border border-border/50 backdrop-blur-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-muted/40 to-transparent">
                      <div>
                        <h2 className="text-2xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                          Add source
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          Choose where to import learning materials from
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-muted-foreground/70 hover:text-foreground transition-all duration-200 rounded-full p-2 hover:bg-muted/60"
                        onClick={() => setShowAddSourceModal(false)}
                        aria-label="Close"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                      <div className="grid grid-cols-2 gap-5">
                        {/* Google Drive Card */}
                        <button
                          type="button"
                          onClick={onAddGoogleDriveClick}
                          disabled={!isGoogleApiLoaded}
                          className="group relative flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-blue-50/50 to-transparent border border-blue-200/30 hover:border-blue-300/60 hover:bg-blue-50/80 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed text-center gap-4 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative w-14 h-14 rounded-2xl bg-blue-100/60 flex items-center justify-center group-hover:bg-blue-200/80 transition-all duration-300 shadow-sm">
                            <svg
                              className="w-8 h-8 text-blue-600"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M7.71 3.5L1.15 15l3.58 6.5L11.29 9.5 7.71 3.5M9.73 15L6.15 21.5h7.16L17 15H9.73m7.06-11.5l-3.58 6.5L19.87 15l3.58-6.5-6.66-6M8.5 12l3.58 6.5L15.66 15 12.08 8.5 8.5 12z" />
                            </svg>
                          </div>
                          <div className="relative">
                            <div className="font-semibold mb-1">
                              Google Drive
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {driveSelectionCount > 0 ? (
                                <span className="text-blue-600 font-medium">
                                  Selected {driveSelectionCount} file
                                  {driveSelectionCount !== 1 ? 's' : ''}
                                </span>
                              ) : (
                                'Import files from Drive (multi-select)'
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Upload Files Card */}
                        <button
                          type="button"
                          onClick={onAddLocalFileClick}
                          className="group relative flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-purple-50/50 to-transparent border border-purple-200/30 hover:border-purple-300/60 hover:bg-purple-50/80 transition-all duration-300 text-center gap-4 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative w-14 h-14 rounded-2xl bg-purple-100/60 flex items-center justify-center group-hover:bg-purple-200/80 transition-all duration-300 shadow-sm">
                            <svg
                              className="w-8 h-8 text-purple-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                          </div>
                          <div className="relative">
                            <div className="font-semibold mb-1">Upload</div>
                            <div className="text-xs text-muted-foreground">
                              PDF, TXT, Markdown, etc.
                            </div>
                          </div>
                        </button>

                        {/* Website URL Card */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddSourceModal(false);
                            setShowUrlModal(true);
                          }}
                          className="group relative flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-transparent border border-emerald-200/30 hover:border-emerald-300/60 hover:bg-emerald-50/80 transition-all duration-300 text-center gap-4 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative w-14 h-14 rounded-2xl bg-emerald-100/60 flex items-center justify-center group-hover:bg-emerald-200/80 transition-all duration-300 shadow-sm">
                            <svg
                              className="w-8 h-8 text-emerald-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                              />
                            </svg>
                          </div>
                          <div className="relative">
                            <div className="font-semibold mb-1">
                              Website URL
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Paste a public URL
                            </div>
                          </div>
                        </button>

                        {/* Copy & Paste Card */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddSourceModal(false);
                            setShowPasteModal(true);
                          }}
                          className="group relative flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-amber-50/50 to-transparent border border-amber-200/30 hover:border-amber-300/60 hover:bg-amber-50/80 transition-all duration-300 text-center gap-4 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative w-14 h-14 rounded-2xl bg-amber-100/60 flex items-center justify-center group-hover:bg-amber-200/80 transition-all duration-300 shadow-sm">
                            <svg
                              className="w-8 h-8 text-amber-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                          </div>
                          <div className="relative">
                            <div className="font-semibold mb-1">
                              Copy & paste
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Paste text directly
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Paste Text Modal */}
              {showPasteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-8 min-w-[340px] max-w-[90vw] flex flex-col gap-4 relative">
                    <button
                      type="button"
                      className="absolute top-3 right-3 text-lg text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPasteModal(false)}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                    <div className="text-lg font-semibold mb-2">
                      Paste Copied Text
                    </div>
                    <textarea
                      className="w-full min-h-[100px] rounded border p-2 text-base bg-background"
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="Paste your text here..."
                    />
                    <Button
                      size="sm"
                      variant="default"
                      className="self-end"
                      onClick={handleAddPastedText}
                      disabled={!pasteText.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {/* Add Website URL Modal */}
              {showUrlModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-8 min-w-[340px] max-w-[90vw] flex flex-col gap-4 relative">
                    <button
                      type="button"
                      className="absolute top-3 right-3 text-lg text-muted-foreground hover:text-foreground"
                      onClick={() => setShowUrlModal(false)}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                    <div className="text-lg font-semibold mb-2">
                      Add Website URL
                    </div>
                    <input
                      className="w-full rounded border p-2 text-base bg-background"
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com"
                    />
                    <Button
                      size="sm"
                      variant="default"
                      className="self-end"
                      onClick={handleAddUrl}
                      disabled={!urlInput.trim() || urlLoading}
                    >
                      {urlLoading ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {/* Resize handle */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sources panel"
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors"
              onMouseDown={(e) => {
                setDragStartX(e.clientX);
                setDragStartWidth(sourcesWidth);
                setIsResizingSources(true);
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                }
              }}
            />
          </section>
        )}
        {!showSources && (
          <div className="border rounded-md p-2 flex items-center justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSources(true)}
                  className="md:px-2 md:h-fit"
                >
                  <div className="rotate-180">
                    <SidebarLeftIcon size={16} />
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Expand Sources</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* CENTER: Instructor Chat */}
        <section className="flex-1 flex flex-col overflow-hidden relative">
          {/* Left resize handle */}
          {showSources && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize chat left edge"
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors z-10"
              onMouseDown={(e) => {
                setDragStartX(e.clientX);
                setDragStartWidth(sourcesWidth);
                setIsResizingSources(true);
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                }
              }}
            />
          )}
          {/* Right resize handle */}
          {showStudio && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize chat right edge"
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors z-10"
              onMouseDown={(e) => {
                setDragStartX(e.clientX);
                setDragStartWidth(studioWidth);
                setIsResizingStudio(true);
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                }
              }}
            />
          )}
          <div className="rounded-md border flex-1 p-0 overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/50 flex-shrink-0">
              <h2 className="text-sm font-semibold">Instructor Chat</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled>
                  Summarize
                </Button>
                <Button size="sm" variant="outline" disabled>
                  Extract Concepts
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <InstructorChat
                sources={sources}
                enabledSourceIds={enabledSources}
                chatId={instructorChatId}
                onStoreNote={handleStoreNote}
              />
            </div>
          </div>
        </section>

        {/* RIGHT: Studio (teaching tools & AI features) */}
        {showStudio && (
          <section
            className="flex-shrink-0 space-y-3 overflow-auto relative border rounded-md p-3"
            style={{ width: `${studioWidth}px` }}
          >
            {/* Resize handle */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize studio panel"
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors z-10"
              onMouseDown={(e) => {
                setDragStartX(e.clientX);
                setDragStartWidth(studioWidth);
                setIsResizingStudio(true);
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                }
              }}
            />
            <div className="sticky top-0 bg-background pb-2 border-b flex items-center justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowStudio(false)}
                    className="md:px-2 md:h-fit"
                  >
                    <div className="rotate-180">
                      <SidebarLeftIcon size={16} />
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Collapse Studio</TooltipContent>
              </Tooltip>
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Studio
              </h2>
            </div>
            <div className="space-y-3">
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                      Saved Notes
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Pin responses from chat and review them here.
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {notes.length} saved
                  </span>
                </div>

                {notesLoading ? (
                  <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground bg-muted/30">
                    Loading notes...
                  </div>
                ) : notes.length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground bg-muted/30">
                    No notes yet. Use "Store note" under a response to pin it
                    here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        role="button"
                        tabIndex={0}
                        className="w-full text-left rounded-lg border p-3 bg-muted/40 space-y-2 cursor-pointer hover:bg-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                        onClick={() => setSelectedNote(note)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedNote(note);
                          }
                        }}
                        aria-label={`View note: ${note.title}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-sm font-medium truncate">
                              {note.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(note.createdAt).toLocaleString(
                                undefined,
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  month: 'short',
                                  day: 'numeric',
                                },
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyNote(note);
                              }}
                            >
                              Copy
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveNote(note.id);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                      Quick Actions
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Finish a lesson faster with one-click helpers.
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Shortcuts
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start text-xs"
                  >
                    📌 Summarize newest note
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start text-xs"
                  >
                    📤 Export notes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start text-xs"
                  >
                    🧭 Next learning step
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start text-xs"
                  >
                    ✅ Create checklist
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
        {!showStudio && (
          <div className="border rounded-md p-2 flex items-center justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowStudio(true)}
                  className="md:px-2 md:h-fit"
                >
                  <SidebarLeftIcon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Expand Studio</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Note View Modal */}
      {selectedNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedNote(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSelectedNote(null);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-background rounded-lg shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col border border-border"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="document"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {selectedNote.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedNote.content?.length || 0} characters
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
                  <input
                    type="text"
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    placeholder="Search in note"
                    className="bg-transparent text-sm outline-none w-40"
                  />
                  <div className="text-[11px] text-muted-foreground">
                    {hasNoteMatches
                      ? `${noteMatchIndex + 1}/${noteHighlight.count}`
                      : '0/0'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={!hasNoteMatches}
                    onClick={goToPrevNoteMatch}
                    title="Previous match"
                  >
                    ↑
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={!hasNoteMatches}
                    onClick={goToNextNoteMatch}
                    title="Next match"
                  >
                    ↓
                  </Button>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-2 hover:bg-muted"
                  onClick={() => setSelectedNote(null)}
                  aria-label="Close"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div
                ref={noteContentRef}
                className="text-sm whitespace-pre-wrap font-sans text-foreground/90 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: noteHighlight.html }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">
                {new Date(selectedNote.createdAt).toLocaleString()}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleCopyNote(selectedNote);
                    setSelectedNote(null);
                  }}
                >
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedNote(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Source Content Viewer Modal */}
      {viewingSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeViewer}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              closeViewer();
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-background rounded-lg shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col border border-border"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="document"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {viewingSource.type === 'pdf' && (
                    <svg
                      className="w-6 h-6 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" />
                    </svg>
                  )}
                  {viewingSource.type === 'code' && (
                    <svg
                      className="w-6 h-6 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                      />
                    </svg>
                  )}
                  {viewingSource.type === 'markdown' && (
                    <svg
                      className="w-6 h-6 text-purple-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                  )}
                  {viewingSource.type === 'image' && (
                    <svg
                      className="w-6 h-6 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {viewingSource.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {viewingSource.content?.length || 0} characters
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
                  <input
                    type="text"
                    value={viewerSearch}
                    onChange={(e) => setViewerSearch(e.target.value)}
                    placeholder="Search in source"
                    className="bg-transparent text-sm outline-none w-40"
                  />
                  <div className="text-[11px] text-muted-foreground">
                    {hasViewerMatches
                      ? `${viewerMatchIndex + 1}/${viewerHighlight.count}`
                      : '0/0'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={!hasViewerMatches}
                    onClick={goToPrevMatch}
                    title="Previous match"
                  >
                    ↑
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={!hasViewerMatches}
                    onClick={goToNextMatch}
                    title="Next match"
                  >
                    ↓
                  </Button>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-2 hover:bg-muted"
                  onClick={closeViewer}
                  aria-label="Close"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div
                ref={viewerContentRef}
                className="whitespace-pre-wrap font-sans text-sm leading-relaxed break-words"
                dangerouslySetInnerHTML={{ __html: viewerHighlight.html }}
              />
            </div>

            {/* Footer with Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
              <div className="text-sm text-muted-foreground">
                {viewingSource.sourceUrl ? (
                  <span className="truncate max-w-md block">
                    Source: {viewingSource.sourceUrl}
                  </span>
                ) : (
                  <span>Local file</span>
                )}
              </div>
              <div className="flex gap-2">
                {viewingSource.sourceUrl && (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (viewingSource.sourceUrl) {
                        window.open(viewingSource.sourceUrl, '_blank');
                      }
                    }}
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Open Original
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={closeViewer}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
