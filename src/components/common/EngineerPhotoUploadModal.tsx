import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../forms/Modal';
import { Button } from '../forms/Button';
import api from '../../services/axios';
import {
  Upload,
  AlertTriangle,
  CheckCircle,
  Image as ImageIcon,
  Building2,
  ExternalLink,
  X
} from 'lucide-react';

interface EngineerPhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  engineerId: string;
  engineerName?: string;
  orbitId?: string;
  onSuccess?: () => void;
}

const SHAREPOINT_FOLDER_URL =
  'https://obtmhl.sharepoint.com/:f:/s/GFOLamDashboard/IgCEoaEMIExDTZ8APnqexqm6AW57-lo5YOkQng0OaKntfJ4?e=zAHtzC';

export const EngineerPhotoUploadModal: React.FC<EngineerPhotoUploadModalProps> = ({
  isOpen,
  onClose,
  engineerId,
  engineerName = 'Engineer',
  orbitId = '',
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsUploading(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: JPG, PNG, WEBP
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');

    if (!allowedTypes.includes(file.type) && !isAllowedExt) {
      setErrorMsg('Unsupported file format. Please select a JPG, PNG, or WEBP image.');
      setSelectedFile(null);
      setPreviewUrl(null);
      e.target.value = '';
      return;
    }

    // Validate size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum limit of 5MB.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !engineerId) return;

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await api.post(`/engineers/${engineerId}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessMsg(`Profile photo uploaded to SharePoint successfully!`);

      // Invalidate queries for immediate data refresh
      queryClient.invalidateQueries({ queryKey: ['engineer', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['engineers'] });
      queryClient.invalidateQueries({ queryKey: ['engineer-me'] });

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error uploading engineer photo:', err);
      const detail = err.message || err.details?.detail || 'Failed to upload photo to SharePoint.';
      setErrorMsg(detail);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Engineer Photo"
      subtitle={`Upload official profile photo for ${engineerName} ${orbitId ? `(${orbitId})` : ''}.`}
    >
      <div className="space-y-4">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Upload Error</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-start space-x-2.5">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-500 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold font-mono">{successMsg}</p>
            </div>
          </div>
        )}

        {/* SharePoint Repository Target Information */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
              SharePoint Target Storage:
            </span>
            <a
              href={SHAREPOINT_FOLDER_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
            >
              <span>images of engineers</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Files are stored safely in Microsoft SharePoint using deterministic naming (<code className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded border">{orbitId || 'orbit_id'}.jpg</code>).
          </p>
        </div>

        {/* File Select & Drag Box */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Select Photo File (JPG, PNG, WEBP) <span className="text-rose-500">*</span>
          </label>

          {!previewUrl ? (
            <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white dark:bg-slate-900 group">
              <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-sky-500 transition-colors mb-2" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Click to browse photo file
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Accepted: JPG, PNG, WEBP (Max 5MB)
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center space-x-4">
              <img
                src={previewUrl}
                alt="Upload Preview"
                className="w-16 h-16 rounded-xl object-cover ring-2 ring-sky-300 dark:ring-slate-700 flex-shrink-0"
              />
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-bold text-slate-900 dark:text-white truncate">
                  {selectedFile?.name}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Size: {((selectedFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB
                </p>
                <p className="text-[11px] font-mono text-sky-600 dark:text-sky-400 font-semibold mt-1">
                  Target: {orbitId ? `${orbitId}.${selectedFile?.name.split('.').pop()}` : selectedFile?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Remove selected file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleUploadSubmit}
            disabled={!selectedFile || isUploading}
            loading={isUploading}
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            Upload Image
          </Button>
        </div>
      </div>
    </Modal>
  );
};
