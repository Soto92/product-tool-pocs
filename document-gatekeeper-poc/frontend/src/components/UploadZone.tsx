import { useCallback, useState, useRef } from 'react';
import { UploadCloud, FileText } from 'lucide-react';

interface UploadZoneProps {
  onFile: (file: File) => void;
  loading: boolean;
}

const ACCEPTED = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.txt'];

export default function UploadZone({ onFile, loading }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      setFileName(file.name);
      onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        dragOver
          ? 'border-emerald-500 bg-emerald-500/10'
          : 'border-slate-700 bg-slate-900 hover:border-slate-500'
      } ${loading ? 'pointer-events-none opacity-60' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      <UploadCloud className="h-8 w-8 text-slate-400" />
      <div className="text-sm font-medium text-slate-300">
        {loading ? 'Analyzing…' : 'Drag & drop a document, or click to browse'}
      </div>
      <div className="text-xs text-slate-500">PDF, PNG, JPG, WEBP, TXT — max 15MB</div>
      {fileName && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
          <FileText className="h-3.5 w-3.5" />
          <span className="truncate max-w-[220px]">{fileName}</span>
        </div>
      )}
    </div>
  );
}