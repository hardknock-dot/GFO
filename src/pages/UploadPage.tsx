import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { FileUpload } from '../components/forms/FileUpload';
import { Button } from '../components/forms/Button';
import { Modal } from '../components/forms/Modal';
import { UPLOAD_CARDS_INITIAL, uploadModuleFile } from '../services/upload';
import type { UploadCardItem, BulkUpload } from '../types';
import { Upload, CheckCircle2, FileSpreadsheet, Download, RefreshCw, Building2, Eye } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/axios';
import { useUploadHistory } from '../hooks/useUpload';
import { useQueryClient } from '@tanstack/react-query';

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
    report_url?: string;
  } | null>(null);

  const [selectedTab, setSelectedTab] = useState<'engineers' | 'skills' | 'schedules' | 'visas' | 'travel' | 'performance' | 'leaves'>('engineers');

  const { currentCompany, companies, setCompany } = useCompany();
  const { user } = useAuth();
  const isGlobalAdmin = user?.role === 'Main Admin' || user?.role === 'Global Admin';

  const queryClient = useQueryClient();
  const { data: historyList, isLoading: isLoadingHistory } = useUploadHistory();
  const [selectedHistoryUpload, setSelectedHistoryUpload] = useState<BulkUpload | null>(null);

  const handleViewDetails = (item: BulkUpload) => {
    setSelectedHistoryUpload(item);
  };

  const downloadReportFile = async (url: string) => {
    try {
      const cleanUrl = url.startsWith('/api/') ? url.substring(4) : url;
      const response = await api.get(cleanUrl, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `ORMP_Validation_Report_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download validation report:', err);
      alert('Failed to download validation report.');
    }
  };

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

    queryClient.invalidateQueries({ queryKey: ['bulk-upload-history'] });
    if (selectedCard.id === 'up-visa') {
      queryClient.invalidateQueries({ queryKey: ['visa'] });
    }
    if (selectedCard.id === 'up-travel') {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
    }
    if (selectedCard.id === 'up-performance') {
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    }
    if (selectedCard.id === 'up-leave') {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    }

    // Update card status
    setCards((prev) =>
      prev.map((c) =>
        c.id === selectedCard.id
          ? {
              ...c,
              status: 'Success',
              lastUploaded: new Date().toISOString().replace('T', ' ').substring(0, 16),
              lastUploadedBy: user?.name || 'Admin User',
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

      {/* Target Company Scope Block */}
      <div className="p-5 bg-sky-100/40 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-2xl space-y-4 max-w-md shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-blue-950 dark:text-white mb-1">Target Company</h3>
          <p className="text-xs text-blue-800 dark:text-slate-400">
            Every engineer uploaded through this bulk-upload workflow will automatically receive this company tenant assignment.
          </p>
        </div>

        {isGlobalAdmin ? (
          <div className="w-full">
            <select
              value={currentCompany.company_id || currentCompany.id}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-blue-950 dark:text-slate-200 font-semibold border border-sky-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer text-sm"
            >
              {companies
                .filter((c) => c.id !== 'all-data' && c.company_id !== 'all-data')
                .map((c) => (
                  <option key={c.id || c.company_id} value={c.company_id || c.id}>
                    {c.company_name || c.name}
                  </option>
                ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border border-sky-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-blue-950 dark:text-slate-200 font-semibold">
            <Building2 className="w-4 h-4 text-sky-500" />
            <span>{currentCompany.company_name || currentCompany.name}</span>
          </div>
        )}
      </div>

      {/* Data Type Selector Tabs */}
      <div className="flex space-x-1 p-1 bg-slate-100/80 dark:bg-slate-800 rounded-xl max-w-sm mb-2 shadow-sm border border-slate-200/40 dark:border-slate-700">
        <button
          onClick={() => setSelectedTab('engineers')}
          className={`flex-1 py-2 px-4 text-xs font-extrabold rounded-lg transition-all ${
            selectedTab === 'engineers'
              ? 'bg-white dark:bg-slate-900 text-[var(--color-secondary)] shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Engineers
        </button>
        <button
          onClick={() => setSelectedTab('skills')}
          className={`flex-1 py-2 px-4 text-xs font-extrabold rounded-lg transition-all ${
            selectedTab === 'skills'
              ? 'bg-white dark:bg-slate-900 text-[var(--color-secondary)] shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Skills
        </button>
        <button
          onClick={() => setSelectedTab('schedules')}
          className={`flex-1 py-2 px-4 text-xs font-extrabold rounded-lg transition-all ${
            selectedTab === 'schedules'
              ? 'bg-white dark:bg-slate-900 text-[var(--color-secondary)] shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Schedules
        </button>
        <button
          onClick={() => setSelectedTab('visas')}
          className={`flex-1 py-2 px-4 text-xs font-extrabold rounded-lg transition-all ${
            selectedTab === 'visas'
              ? 'bg-white dark:bg-slate-900 text-[var(--color-secondary)] shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Visas & Permits
        </button>
        <button
          onClick={() => setSelectedTab('travel')}
          className={`flex-1 py-2 px-4 text-xs font-extrabold rounded-lg transition-all ${
            selectedTab === 'travel'
              ? 'bg-white dark:bg-slate-900 text-[var(--color-secondary)] shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Travel & Mobility
        </button>
        <button
          onClick={() => setSelectedTab('performance')}
          className={`flex-1 py-2 px-4 text-xs font-extrabold rounded-lg transition-all ${
            selectedTab === 'performance'
              ? 'bg-white dark:bg-slate-900 text-[var(--color-secondary)] shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Performance & Reviews
        </button>
        <button
          onClick={() => setSelectedTab('leaves')}
          className={`flex-1 py-2 px-4 text-xs font-extrabold rounded-lg transition-all ${
            selectedTab === 'leaves'
              ? 'bg-white dark:bg-slate-900 text-[var(--color-secondary)] shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Leaves & Absences
        </button>
      </div>

      {/* Grid of Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards
          .filter((card) => {
            if (selectedTab === 'engineers') return card.id === 'up-engineers';
            if (selectedTab === 'skills') return card.id === 'up-skills';
            if (selectedTab === 'schedules') return card.id === 'up-schedule';
            if (selectedTab === 'visas') return card.id === 'up-visa';
            if (selectedTab === 'travel') return card.id === 'up-travel';
            if (selectedTab === 'performance') return card.id === 'up-performance';
            if (selectedTab === 'leaves') return card.id === 'up-leave';
            return true;
          })
          .map((card) => (
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
                <a
                  href={card.templateUrl}
                  download
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                  title="Download Excel Template"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for file Ingestion */}
      {selectedCard && (
        <Modal
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          title={selectedCard.title}
          subtitle={`Target Company Scope: ${currentCompany.company_name || currentCompany.name}`}
        >
          <div className="space-y-5">
            <FileUpload
              acceptedFormats={selectedCard.acceptedFormats}
              onFileSelect={(f) => setSelectedFile(f)}
              disabled={uploading}
            />

            {/* Validation & Import Summary */}
            {summaryResult ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl space-y-3 text-xs">
                <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Validation & Ingestion Complete</span>
                </div>
                <p className="text-emerald-700 dark:text-emerald-400">{summaryResult.message}</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 font-mono text-emerald-900 dark:text-emerald-200">
                  <div>Rows Processed: {summaryResult.rowsProcessed}</div>
                  <div>Schema Errors: {summaryResult.errorsCount}</div>
                </div>
                {summaryResult.report_url && (
                  <div className="pt-2 border-t border-emerald-200/60 flex justify-start">
                    <Button
                      size="sm"
                      onClick={() => downloadReportFile(summaryResult.report_url!)}
                      icon={<Download className="w-3.5 h-3.5" />}
                    >
                      Download Validation Report
                    </Button>
                  </div>
                )}
              </div>
            ) : selectedCard.id === 'up-skills' ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">FastAPI Ingestion Validation Rules (Skills Matrix):</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Mandatory column: <strong>Orbit ID</strong>.</li>
                  <li>Dates must be valid, and End Date must be &ge; Start Date.</li>
                  <li>Number of Tools must be a non-negative integer.</li>
                  <li>Booleans accept Yes/No, True/False, Y/N, 1/0.</li>
                </ul>
              </div>
            ) : selectedCard.id === 'up-schedule' ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">FastAPI Ingestion Validation Rules (Schedules):</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Mandatory columns: <strong>Orbit ID</strong>, <strong>Support Type</strong>, <strong>Country</strong>, <strong>Start Date</strong>.</li>
                  <li>Dates must be valid, and End Date must be &ge; Start Date.</li>
                  <li>Defaults status to <code>Upcoming</code> if blank.</li>
                </ul>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">FastAPI Ingestion Validation Rules (Engineers):</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Mandatory columns: <strong>Engineer Name</strong>, <strong>Orbit ID</strong>.</li>
                  <li>Dates formatted ISO-8601 (YYYY-MM-DD).</li>
                  <li>Duplicate Orbit IDs automatically flagged for validation error.</li>
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

      {/* Upload History Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2 flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-[var(--color-secondary)]" />
          <span>Upload History & Audit Trail</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Review bulk data validation results, import metrics, statuses, and download validation reports.
        </p>

        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-2 text-xs text-slate-500">Loading upload history...</span>
          </div>
        ) : !historyList || historyList.filter((item) => {
          if (selectedTab === 'engineers') return item.uploadType === 'engineers';
          if (selectedTab === 'skills') return item.uploadType === 'skills';
          return item.uploadType === 'schedules';
        }).length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No upload history found</p>
            <p className="text-xs text-slate-400 mt-1">Upload records will appear here after they are processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Target Company</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 text-center px-4">Total</th>
                  <th className="py-3 text-center px-4">Imported</th>
                  <th className="py-3 text-center px-4">Errors</th>
                  <th className="py-3 text-center px-4">Duplicates</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
                {historyList
                  .filter((item) => {
                    if (selectedTab === 'engineers') return item.uploadType === 'engineers';
                    if (selectedTab === 'skills') return item.uploadType === 'skills';
                    return item.uploadType === 'schedules';
                  })
                  .map((item) => (
                  <tr key={item.uploadId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white max-w-[200px] truncate" title={item.fileName}>
                      {item.fileName}
                    </td>
                    <td className="py-3.5 px-4 capitalize">{item.uploadType}</td>
                    <td className="py-3.5 px-4">{item.companyName}</td>
                    <td className="py-3.5 px-4">{item.uploadedByName}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">{item.totalRows}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">{item.importedRows}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-rose-600 dark:text-rose-400">{item.errorRows}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-amber-600 dark:text-amber-400">{item.duplicateRows}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {item.reportFile && (
                          <button
                            onClick={() => downloadReportFile(`/api/upload/download-report/${item.reportFile}`)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-[var(--color-secondary)] transition-colors"
                            title="Download Report"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedHistoryUpload && (
        <Modal
          isOpen={!!selectedHistoryUpload}
          onClose={() => setSelectedHistoryUpload(null)}
          title="Upload Process Audit Details"
          subtitle={`Audit log for bulk ingestion file: ${selectedHistoryUpload.fileName}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Upload ID</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedHistoryUpload.uploadId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">File Name</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">{selectedHistoryUpload.fileName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Upload Type</span>
                  <span className="text-slate-800 dark:text-slate-200 capitalize">{selectedHistoryUpload.uploadType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Target Company</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedHistoryUpload.companyName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Uploaded By</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedHistoryUpload.uploadedByName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Created At</span>
                  <span className="text-slate-800 dark:text-slate-200">{new Date(selectedHistoryUpload.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Completed At</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedHistoryUpload.completedAt ? new Date(selectedHistoryUpload.completedAt).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Current Ingestion Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block mt-0.5 ${getStatusBadgeColor(selectedHistoryUpload.status)}`}>
                    {selectedHistoryUpload.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">Row Validation & Import Counts</h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Rows</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{selectedHistoryUpload.totalRows}</div>
                </div>
                <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-lg">
                  <div className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">Valid Rows</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedHistoryUpload.validRows}</div>
                </div>
                <div className="p-2 bg-rose-50/50 dark:bg-rose-950/10 rounded-lg">
                  <div className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider">Errors</div>
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">{selectedHistoryUpload.errorRows}</div>
                </div>
                <div className="p-2 bg-amber-50/50 dark:bg-amber-950/10 rounded-lg">
                  <div className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider">Duplicates</div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">{selectedHistoryUpload.duplicateRows}</div>
                </div>
                <div className="p-2 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-lg">
                  <div className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider">Existing Rows</div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{selectedHistoryUpload.existingRows}</div>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">Imported</div>
                  <div className="text-lg font-bold text-emerald-800 dark:text-emerald-400 mt-0.5">{selectedHistoryUpload.importedRows}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              {selectedHistoryUpload.reportFile && (
                <Button
                  onClick={() => downloadReportFile(`/api/upload/download-report/${selectedHistoryUpload.reportFile!}`)}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Download Report File
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelectedHistoryUpload(null)}>
                Close Details
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
    case 'COMPLETED_WITH_ERRORS':
      return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
    case 'VALIDATING':
    case 'IMPORTING':
      return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
    case 'READY':
      return 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30';
    case 'FAILED':
    default:
      return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
  }
};
