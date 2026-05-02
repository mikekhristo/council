'use client';

import { useState, useRef, useCallback } from 'react';
import type { FileAttachment } from '@/lib/types';
import { Icon } from '@/components/shared/icon';
import { formatBytes } from '@/lib/utils/format';

interface FileUploaderProps {
  files: FileAttachment[];
  onFilesChange: (files: FileAttachment[]) => void;
}

const ACCEPTED_EXTENSIONS = '.txt,.md,.pdf,.docx,.csv';

export function FileUploader({ files, onFilesChange }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (fileList: FileList) => {
      setIsUploading(true);
      const uploads = Array.from(fileList).map(async (file) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) return null;
          return (await res.json()) as FileAttachment;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(uploads);
      const newFiles = results.filter((f): f is FileAttachment => f !== null);

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles]);
      }
      setIsUploading(false);
    },
    [files, onFilesChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
    },
    [handleUpload],
  );

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <div>
      <div
        className="drop"
        data-over={isDragging}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => {
            if (e.target.files?.length) handleUpload(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
        <Icon name="doc" size={18} />
        <div style={{ marginTop: 8, fontSize: 13 }}>
          {isUploading ? (
            <span className="serif-i">Uploading…</span>
          ) : (
            <>
              <span className="serif-i">Drop files here</span>
              <span style={{ color: 'var(--ink-faint)' }}> · or </span>
              <span
                style={{
                  borderBottom: '1px solid var(--ink-mute)',
                  cursor: 'pointer',
                }}
              >
                browse
              </span>
            </>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div
          style={{
            marginTop: 14,
            border: '1px solid var(--rule)',
            background: 'var(--paper)',
          }}
        >
          {files.map((f, i) => (
            <div
              key={f.id}
              className="flex items-center"
              style={{
                gap: 12,
                padding: '10px 14px',
                borderBottom: i < files.length - 1 ? '1px solid var(--rule)' : 'none',
              }}
            >
              <Icon name="doc" size={13} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>
                {f.filename}
              </span>
              <span
                className="mono"
                style={{ fontSize: 11, color: 'var(--ink-mute)' }}
              >
                {formatBytes(f.sizeBytes)}
              </span>
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                className="btn-ghost"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 4,
                  color: 'var(--ink-mute)',
                }}
              >
                <Icon name="x" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
