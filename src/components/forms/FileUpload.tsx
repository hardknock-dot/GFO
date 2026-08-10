import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

interface FileUploadProps {
  acceptedFormats?: string[];
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  acceptedFormats = ['.csv', '.xlsx'],
  onFileSelect,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150 ${
          dragOver
            ? 'border-[var(--color-accent)] bg-[var(--color-accent-transparent)]'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
        <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-2 text-[var(--color-secondary)]">
          <UploadCloud className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          <span className="text-[var(--color-secondary)] font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-slate-400 mt-1">Supported formats: {acceptedFormats.join(', ')} (Max 25MB)</p>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg text-emerald-900 dark:text-emerald-200 text-xs">
          <div className="flex items-center space-x-2 truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium truncate">{selectedFile.name}</span>
            <span className="text-emerald-600 dark:text-emerald-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFile(null);
            }}
            className="text-emerald-700 hover:text-emerald-900 text-xs py-0 h-6"
          >
            Change
          </Button>
        </div>
      )}
    </div>
  );
};
