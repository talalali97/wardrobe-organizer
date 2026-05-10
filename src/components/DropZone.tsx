'use client';

import { useState } from 'react';
import { Upload, Plus, Camera } from 'lucide-react';

interface DropZoneProps {
  onFiles: (files: FileList) => void;
}

export function DropZone({ onFiles }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-sm p-7 text-center mb-4 transition-colors ${
        dragOver
          ? 'bg-accent-dim border-accent'
          : 'bg-zinc-900 border-zinc-700'
      }`}
    >
      <Upload
        size={32}
        className={`mx-auto mb-2.5 ${dragOver ? 'text-accent' : 'text-zinc-700'}`}
      />
      <div
        className={`text-[13px] font-semibold mb-1 ${
          dragOver ? 'text-accent' : 'text-zinc-50'
        }`}
      >
        {dragOver ? 'DROP TO INGEST' : 'Drop photos or use a button below'}
      </div>
      <div className="text-[11px] text-zinc-500 mb-3.5">
        Multiple files OK · auto-classified · stored in Supabase
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        <label className="relative inline-flex items-center gap-1.5 bg-accent text-zinc-950 font-semibold px-4 py-2.5 text-[11px] tracking-[1px] uppercase rounded-sm cursor-pointer select-none">
          <Plus size={13} /> Add photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => {
              if (e.target.files) onFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>

        <label className="relative inline-flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 text-zinc-50 px-4 py-2.5 text-[11px] tracking-[1px] uppercase rounded-sm cursor-pointer select-none">
          <Camera size={13} /> Camera
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => {
              if (e.target.files) onFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );
}
