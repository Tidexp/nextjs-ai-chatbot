'use client';

import React from 'react';
import { useInstructorMode } from '@/hooks/use-instructor-mode';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SidebarLeftIcon } from '@/components/icons';

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
    if (!response.ok) throw new Error('Failed to save source');
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
    });
    if (!response.ok) throw new Error('Failed to delete source');
  } catch (error) {
    console.error('Failed to delete source from API:', error);
    throw error;
  }
};

import { InstructorChat } from './instructor-chat';

export function InstructorPanel() {
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
    try {
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
        try {
          const arrayBuffer = await file.arrayBuffer();
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ arrayBuffer });
          return result.value || '';
        } catch (err) {
          console.error('Failed to parse DOCX', err);
        }
      }
      // XLSX parsing via xlsx (SheetJS) — flatten all sheets to plain text
      if (
        file.name.toLowerCase().endsWith('.xlsx') ||
        file.name.toLowerCase().endsWith('.xls')
      ) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const XLSX = await import('xlsx');
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          const parts: string[] = [];
          for (const sheetName of wb.SheetNames) {
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
          const arrayBuffer = await file.arrayBuffer();
          const pdfjsLib = await import('pdfjs-dist');
          // Worker is optional in modern builds; set if available
          try {
            // @ts-ignore
            pdfjsLib.GlobalWorkerOptions.workerSrc =
              '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          } catch {}
          // @ts-ignore
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          const texts: string[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
              .map((item: any) =>
                typeof item.str === 'string' ? item.str : '',
              )
              .filter(Boolean)
              .join(' ');
            texts.push(`\n\n--- Page ${i} ---\n${pageText}`);
          }
          return texts.join('\n');
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
    const newSources: SourceItemWithContent[] = [];

    for (const f of files) {
      try {
        const type = detectType(f);
        const content = await readFileContent(f);
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
        newSources.push(savedSource);
        // Add to sources immediately so user sees it right away
        setSources((prev) => [savedSource, ...prev]);
      } catch (error) {
        console.error(`Failed to upload ${f.name}:`, error);
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

        // Fetch full content for RAG embedding (for text-based files)
        let excerpt = `${type.toUpperCase()} from Google Drive`;
        if (type !== 'image' && type !== 'pdf') {
          try {
            const response = await fetch(exportUrl, {
              headers: {
                Authorization: `Bearer ${session?.accessToken}`,
              },
            });
            if (response.ok) {
              const fullContent = await response.text();
              content = fullContent; // Store full content for RAG
              excerpt = fullContent.slice(0, 200).replace(/\s+/g, ' ').trim();
              console.log(
                `[Google Drive] Fetched ${fullContent.length} chars from ${doc.name}`,
              );
            } else if (response.status === 403) {
              console.error(
                'Google Drive API 403 error. The OAuth token may not have sufficient permissions.',
              );
              excerpt = 'Preview unavailable - permission denied';
            } else {
              console.error(`Google Drive API error: ${response.status}`);
              excerpt = 'Preview unavailable';
            }
          } catch (error) {
            console.error('Error fetching content from Google Drive:', error);
          }
        }

        // Store Google Drive file reference with full content for RAG
        const driveFileUrl = `https://drive.google.com/file/d/${doc.id}/view`;

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
          // Add to sources immediately so user sees it right away
          setSources((prev) => [savedSource, ...prev]);
        } catch (error) {
          console.error(`Failed to save ${doc.name}:`, error);
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

    // Use Google Identity Services for OAuth
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.access_token || session?.accessToken) {
          const token = response.access_token || session?.accessToken;

          // Open picker with the access token
          const picker = new window.google.picker.PickerBuilder()
            .addView(window.google.picker.ViewId.DOCS)
            .addView(window.google.picker.ViewId.DOCS_IMAGES)
            .setOAuthToken(token)
            .setDeveloperKey(GOOGLE_API_KEY)
            .setAppId(GOOGLE_APP_ID)
            .setCallback(handlePickerCallback)
            .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
            .build();

          picker.setVisible(true);
        }
      },
    });

    // If user is already logged in with Google, use session token; otherwise request new token
    if (session?.accessToken) {
      tokenClient.callback({ access_token: session.accessToken });
    } else {
      tokenClient.requestAccessToken();
    }
  };

  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className="text-lg font-semibold">Instructor Mode</h1>
        <Button variant="outline" onClick={() => setActive(false)}>
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
            <div className="flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Sources
              </h2>
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
                        if (!isLoading && s.sourceUrl) {
                          window.open(s.sourceUrl, '_blank');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!isLoading && s.sourceUrl) {
                            window.open(s.sourceUrl, '_blank');
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
                accept=".md,.txt,.js,.ts,application/pdf,image/*,text/*"
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

            {/* Assessment Tools */}
            <div className="rounded-md border p-3 space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Assessment
              </h3>
              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  📝 Multiple Choice Test
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  ❓ Generate Quiz
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  💡 Practice Problems
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  🎯 True/False Questions
                </Button>
              </div>
            </div>

            {/* Learning Aids */}
            <div className="rounded-md border p-3 space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Learning Aids
              </h3>
              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  📚 Learning Guide
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  🃏 Create Flashcards
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  🧠 Mind Map
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  📊 Concept Tree
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  🔗 Key Connections
                </Button>
              </div>
            </div>

            {/* Content Analysis */}
            <div className="rounded-md border p-3 space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Analysis
              </h3>
              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  📖 Summarize Content
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  🎓 Extract Key Concepts
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  🔍 Find References
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  📚 Related Resources
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  ⚠️ Common Misconceptions
                </Button>
              </div>
            </div>

            {/* Explanation Tools */}
            <div className="rounded-md border p-3 space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Explain
              </h3>
              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  💭 Explain with Analogy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  👶 Simplify (ELI5)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  🔬 Deep Dive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  📝 Step-by-Step Guide
                </Button>
              </div>
            </div>

            {/* Code & Practice */}
            <div className="rounded-md border p-3 space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Code Tools
              </h3>
              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  🔧 Refactor Code
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  🐛 Debug Strategies
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  ⚡ Optimization Tips
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  📦 Code Examples
                </Button>
              </div>
            </div>

            {/* Export & Share */}
            <div className="rounded-md border p-3 space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Export
              </h3>
              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  � Export as PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  📋 Copy Study Guide
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                >
                  � Share Session
                </Button>
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
    </div>
  );
}
