import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { FileUpload } from '../components/forms/FileUpload';
import { Button } from '../components/forms/Button';
import { Modal } from '../components/forms/Modal';
import { UPLOAD_CARDS_INITIAL, uploadModuleFile } from '../services/upload';
import type { UploadCardItem } from '../types';
import { Upload, CheckCircle2, FileSpreadsheet, Download, RefreshCw } from 'lucide-react';

export const UploadPage: React.FC = () => {
  const [cards, setCards] = useState<UploadCardItem[]>(UPLOAD_CARDS_INITIAL);
  const [selectedCard, setSelectedCard] = useState<UploadCardItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summaryResult, setSummaryResult] = useState<{
    success: boolean;
    rowsProcessed: number;
    errorsCount: number;
    message: string;
  } | null>(null);

  const handleOpenUploadModal = (card: UploadCardItem) => {
    setSelectedCard(card);
    setSelectedFile(null);
    setSummaryResult(null);
  };

  const handleStartUpload = async () => {
    if (!selectedCard || !selectedFile) return;
    setUploading(true);
    const result = await uploadModuleFile(selectedCard.id, selectedFile);
    setUploading(false);
    setSummaryResult(result);

    // Update card status
    setCards((prev) =>
      prev.map((c) =>
        c.id === selectedCard.id
          ? {
              ...c,
              status: 'Success',
              lastUploaded: new Date().toISOString().replace('T', ' ').substring(0, 16),
              lastUploadedBy: 'Admin User',
            }
          : c
      )
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Enterprise Upload Center"
        subtitle="Bulk ingest and synchronize field engineer rosters, schedule assignments, skill matrices, visas, and flight itineraries directly with FastAPI backend."
      />

      {/* Grid of Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.id}
            className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[var(--color-secondary)]">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    card.status === 'Success'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : card.status === 'Validating'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {card.status}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">{card.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {card.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>FastAPI Endpoint:</span>
                <span className="text-slate-600 dark:text-slate-300">{card.targetEndpoint}</span>
              </div>

              {card.lastUploaded && (
                <div className="text-[11px] text-slate-400">
                  Last Sync: <span className="font-semibold text-slate-700 dark:text-slate-300">{card.lastUploaded}</span>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleOpenUploadModal(card)}
                  icon={<Upload className="w-3.5 h-3.5" />}
                >
                  Upload File
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  title="Download CSV Template"
                  onClick={() => alert(`Downloading template for ${card.title}`)}
                  icon={<Download className="w-3.5 h-3.5 text-slate-500" />}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for file ingestion */}
      {selectedCard && (
        <Modal
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          title={selectedCard.title}
          subtitle={`Target API Endpoint: ${selectedCard.targetEndpoint}`}
        >
          <div className="space-y-5">
            <FileUpload
              acceptedFormats={selectedCard.acceptedFormats}
              onFileSelect={(f) => setSelectedFile(f)}
              disabled={uploading}
            />

            {/* Validation & Import Summary Placeholder */}
            {summaryResult ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Validation & Ingestion Complete</span>
                </div>
                <p className="text-emerald-700 dark:text-emerald-400">{summaryResult.message}</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 font-mono text-emerald-900 dark:text-emerald-200">
                  <div>Rows Processed: {summaryResult.rowsProcessed}</div>
                  <div>Schema Errors: {summaryResult.errorsCount}</div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">FastAPI Ingestion Validation Rules:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Mandatory column headers match standard ORMP JSON schema.</li>
                  <li>Dates formatted ISO-8601 (YYYY-MM-DD).</li>
                  <li>Duplicate Orbit IDs automatically flagged for upsert.</li>
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="outline" onClick={() => setSelectedCard(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleStartUpload}
                loading={uploading}
                disabled={!selectedFile || uploading}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Execute API Ingestion
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
