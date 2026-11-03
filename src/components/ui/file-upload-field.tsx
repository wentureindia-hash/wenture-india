"use client";

import React, { useState } from "react";

export type UploadStatus = "idle" | "selected" | "uploading" | "success" | "error";

interface FileUploadFieldProps {
  id?: string;
  label: string;
  description?: string;
  accept: string;
  fileTypeLabel: "PDF" | "Image";
  icon?: string;
  currentFile: File | null;
  currentUrl?: string;
  currentFileName?: string;
  uploadStatus: UploadStatus;
  uploadProgressText?: string;
  errorMessage?: string | null;
  onFileSelect: (file: File) => void;
  onUploadRetry?: () => void;
  onRemove: () => void;
  onValidationError?: (err: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function FileUploadField({
  id,
  label,
  description,
  accept,
  fileTypeLabel,
  icon = fileTypeLabel === "PDF" ? "picture_as_pdf" : "image",
  currentFile,
  currentUrl,
  currentFileName,
  uploadStatus,
  uploadProgressText,
  errorMessage,
  onFileSelect,
  onUploadRetry,
  onRemove,
  onValidationError,
  disabled = false,
  required = false,
}: FileUploadFieldProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleValidateAndSelect = (file: File | null) => {
    if (!file) return;

    if (fileTypeLabel === "PDF") {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        const msg = "Please select a valid PDF document (.pdf).";
        onValidationError?.(msg);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const msg = `Pitch deck file size must be less than 20MB (selected: ${sizeMb}MB).`;
        onValidationError?.(msg);
        return;
      }
    } else {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
      const validExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
      const lower = file.name.toLowerCase();
      const hasExt = validExtensions.some((ext) => lower.endsWith(ext));
      const hasType = validTypes.includes(file.type);
      if (!hasType && !hasExt) {
        const msg = "Please select a valid image file (JPG, PNG, or WebP).";
        onValidationError?.(msg);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const msg = `Image file size must be less than 5MB (selected: ${sizeMb}MB).`;
        onValidationError?.(msg);
        return;
      }
    }

    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || uploadStatus === "uploading") return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleValidateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const hasAttachedFile = Boolean(currentFile || currentUrl || currentFileName);
  const displayName = currentFile?.name || currentFileName || "Attached Document";
  const displaySize = currentFile ? `(${(currentFile.size / (1024 * 1024)).toFixed(2)} MB)` : "";

  return (
    <div className="p-3.5 sm:p-4 bg-[#F4FAFD] border border-[#DCECF2] rounded-2xl space-y-2.5 transition-all">
      {/* Label and description */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-[#00A6E8] shrink-0">
            {icon}
          </span>
          <div>
            <label className="block text-xs font-bold text-[#0A192A]">
              {label} {required && <span className="text-rose-500">*</span>}
            </label>
            {description && (
              <p className="text-[11px] text-[#5F7180] leading-snug">{description}</p>
            )}
          </div>
        </div>

        {uploadStatus === "uploading" && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 border border-sky-200 text-sky-700 rounded-lg text-[11px] font-bold shrink-0 animate-pulse">
            <div className="w-3 h-3 border-2 border-[#00A6E8] border-t-transparent rounded-full animate-spin" />
            <span>{uploadProgressText || "Uploading..."}</span>
          </span>
        )}
      </div>

      {/* Upload States UI */}
      {uploadStatus === "error" && errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0 mt-0.5">
              error
            </span>
            <div className="flex-1">
              <strong className="block font-bold">Upload Failed</strong>
              <p className="text-[11px] text-rose-800 leading-snug mt-0.5">{errorMessage}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-rose-200/60">
            {onUploadRetry && currentFile && (
              <button
                type="button"
                onClick={onUploadRetry}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                <span>Retry Upload</span>
              </button>
            )}
            <button
              type="button"
              onClick={onRemove}
              className="px-3 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
              <span>Remove / Skip</span>
            </button>
          </div>
        </div>
      )}

      {/* If file is attached / selected / uploaded */}
      {hasAttachedFile && uploadStatus !== "error" ? (
        <div className="flex items-center justify-between p-3 bg-white border border-[#DCECF2] rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-xs text-[#0A192A] font-semibold truncate pr-2">
            {uploadStatus === "success" || currentUrl ? (
              <span className="material-symbols-outlined text-[20px] text-emerald-600 shrink-0">
                task_alt
              </span>
            ) : (
              <span className="material-symbols-outlined text-[20px] text-[#00A6E8] shrink-0">
                attach_file
              </span>
            )}
            <span className="truncate">{displayName}</span>
            {displaySize && (
              <span className="text-[11px] text-[#5F7180] font-normal shrink-0">{displaySize}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {currentUrl && (
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-slate-500 hover:text-[#00A6E8] rounded-lg hover:bg-slate-50 transition-colors"
                title="View attached file"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
              </a>
            )}
            <button
              type="button"
              disabled={disabled || uploadStatus === "uploading"}
              onClick={onRemove}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-40"
              title="Remove file"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      ) : uploadStatus !== "error" ? (
        /* Dropzone / File Picker */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
            dragActive
              ? "border-[#00A6E8] bg-[#EBF6FC]"
              : "border-[#DCECF2] bg-white hover:border-[#00A6E8]/60 hover:bg-slate-50/60"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <input
            id={id}
            type="file"
            accept={accept}
            disabled={disabled || uploadStatus === "uploading"}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleValidateAndSelect(e.target.files[0]);
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
            <span className="material-symbols-outlined text-[26px] text-slate-400">
              upload_file
            </span>
            <div className="text-xs text-[#0A192A]">
              <span className="font-bold text-[#00A6E8]">Click to choose</span> or drag and drop {fileTypeLabel}
            </div>
            <span className="text-[10px] text-[#5F7180]">
              {fileTypeLabel === "PDF" ? "PDF document up to 20MB" : "JPG, PNG, or WebP up to 5MB"}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
