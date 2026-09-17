import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Filter,
  RotateCcw,
  UserCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useCompany } from '../../context/CompanyContext';
import { getCompanyTheme } from '../../config/companyThemes';
import {
  matchEngineersApi,
  type EngineerMatchRequestPayload,
  type EngineerMatchResponseData,
  type EngineerMatchResultItem
} from '../../services/engineers';

interface FindEngineerMatchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROCESS_OPTIONS = [
  'Etch',
  'Deposition',
  'Strip & Clean',
  'Ion Implantation'
];

const FAMILIES_BY_PROCESS: Record<string, string[]> = {
  Etch: ['Kiyo', 'Flex', 'Sense.i', 'Akara', 'Coronus', 'Selective Etch', 'Syndion', 'Vantex', 'Versys Metal'],
  Deposition: ['Vector', 'Altus', 'Striker', 'Kallisto', 'SPEED', 'Triton', 'Sabre'],
  'Strip & Clean': ['EOS', 'DV-Prime', 'Phoenix', 'Reliant Clean', 'SP Series'],
  'Ion Implantation': ['Purion']
};

const PRODUCTS_BY_FAMILY: Record<string, string[]> = {
  Kiyo: ['Kiyo GX', 'Kiyo FX', 'Kiyo GP'],
  'Sense.i': ['Sense.i Akara', 'Sense.i Vantex CX+'],
  Flex: ['Flex HX'],
  Vector: ['Vector Excel', 'Vector Strata GXE', 'Vector Extreme', 'Vector DT EX', 'Vector Versa G'],
  Altus: ['Altus MAX', 'Altus LFW', 'Altus Halo HX'],
  EOS: ['Clean EOS DS-L', 'Clean EOS-GS-L', 'EOS-DS'],
  'DV-Prime': ['DV-38'],
  Purion: ['Purion H', 'Purion M', 'Purion EXE'],
  Sabre: ['Sabre 3D']
};

const COUNTRY_OPTIONS = [
  'Taiwan',
  'Japan',
  'USA',
  'Singapore',
  'India',
  'Germany',
  'Italy',
  'Austria',
  'Ireland',
  'Korea',
  'Vietnam',
  'China'
];

export const FindEngineerMatchDrawer: React.FC<FindEngineerMatchDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const themeKey = currentCompany.theme_key || currentCompany.company_id || currentCompany.id || currentCompany.code;
  const theme = getCompanyTheme(themeKey);

  const primaryColor = currentCompany.primaryColor || theme.primary || '#C1121F';
  const textOnPrimary = currentCompany.textOnPrimary || '#FFFFFF';
  const cardColor = currentCompany.cardColor || 'var(--color-card)';
  const borderColor = currentCompany.borderColor || 'var(--color-border)';
  const textColor = currentCompany.textColor || 'var(--color-text-primary)';
  const textMutedColor = currentCompany.textMutedColor || 'var(--color-text-secondary)';
  const accentSoft = theme.accentSoft || 'rgba(193, 18, 31, 0.08)';

  const contentRef = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonthStr = nextMonthDate.toISOString().split('T')[0];

  const [country, setCountry] = useState('Taiwan');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(nextMonthStr);
  const [process, setProcess] = useState('');
  const [productFamily, setProductFamily] = useState('');
  const [specificProduct, setSpecificProduct] = useState('');
  const [customer, setCustomer] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [matchData, setMatchData] = useState<EngineerMatchResponseData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto scroll to top when drawer opens or match data is updated
  useEffect(() => {
    if (isOpen) {
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isOpen, matchData]);

  if (!isOpen) return null;

  const availableFamilies = process ? FAMILIES_BY_PROCESS[process] || [] : Object.values(FAMILIES_BY_PROCESS).flat();
  const availableProducts = productFamily ? PRODUCTS_BY_FAMILY[productFamily] || [] : Object.values(PRODUCTS_BY_FAMILY).flat();

  const handleProcessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setProcess(val);
    setProductFamily('');
    setSpecificProduct('');
  };

  const handleFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setProductFamily(val);
    setSpecificProduct('');
  };

  const handleReset = () => {
    setCountry('Taiwan');
    setStartDate(todayStr);
    setEndDate(nextMonthStr);
    setProcess('');
    setProductFamily('');
    setSpecificProduct('');
    setCustomer('');
    setMatchData(null);
    setErrorMsg(null);
  };

  const handleFindMatches = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const payload: EngineerMatchRequestPayload = {
      country,
      start_date: startDate,
      end_date: endDate,
      process: process || undefined,
      product_family: productFamily || undefined,
      specific_product: specificProduct || undefined,
      customer: customer ? customer.trim() : undefined
    };

    try {
      const res = await matchEngineersApi(payload);
      setMatchData(res);
    } catch (err: any) {
      console.error('Error executing engineer match:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to execute engineer matching. Please verify inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCandidateForDeployment = (item: EngineerMatchResultItem) => {
    onClose();
    navigate('/schedule', {
      state: {
        createSchedule: true,
        engineerId: item.engineer_id,
        engineerName: item.engineer_name,
        country: country,
        startDate: startDate,
        endDate: endDate,
        customer: customer
      }
    });
  };

  const renderMatchBadge = (level: string) => {
    switch (level) {
      case 'EXACT_PRODUCT_MATCH':
        return (
          <span
            style={{ backgroundColor: primaryColor, color: textOnPrimary }}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>EXACT PRODUCT</span>
          </span>
        );
      case 'EXACT_VARIANT_MATCH':
        return (
          <span
            style={{ backgroundColor: primaryColor, color: textOnPrimary, opacity: 0.9 }}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs"
          >
            EXACT VARIANT
          </span>
        );
      case 'FAMILY_MATCH':
        return (
          <span
            style={{ backgroundColor: accentSoft, color: primaryColor, borderColor: primaryColor }}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
          >
            FAMILY MATCH
          </span>
        );
      case 'PROCESS_MATCH':
        return (
          <span
            style={{ backgroundColor: accentSoft, color: primaryColor, borderColor: borderColor }}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
          >
            PROCESS MATCH
          </span>
        );
      case 'AMBIGUOUS_MATCH':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            AMBIGUOUS
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            NO MATCH
          </span>
        );
    }
  };

  const renderVisaBadge = (status: string) => {
    switch (status) {
      case 'VALID':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Valid Visa</span>;
      case 'DATES_UNKNOWN':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Visa Dates Unknown</span>;
      case 'EXPIRED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Visa Expired</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">No Visa Record</span>;
    }
  };

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity">
      <div
        style={{
          backgroundColor: cardColor,
          borderColor: borderColor,
        }}
        className="w-full max-w-2xl h-screen shadow-2xl flex flex-col border-l overflow-hidden transition-all duration-200"
      >
        {/* Drawer Header */}
        <div
          style={{
            borderColor: borderColor,
            backgroundColor: cardColor,
          }}
          className="px-6 py-4 border-b flex items-center justify-between shrink-0"
        >
          <div className="flex items-center space-x-3">
            <div
              style={{
                backgroundColor: primaryColor,
                color: textOnPrimary
              }}
              className="p-2.5 rounded-xl shadow-xs"
            >
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                style={{ color: textColor }}
                className="text-lg font-bold flex items-center gap-2"
              >
                <span>Find Engineer for Deployment</span>
              </h2>
              <p
                style={{ color: textMutedColor }}
                className="text-xs opacity-90"
              >
                Deterministic multi-attribute matching across process, product family, availability & visas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ color: textMutedColor }}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content Body */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Deployment Requirement Form */}
          <form
            onSubmit={handleFindMatches}
            style={{
              backgroundColor: cardColor,
              borderColor: borderColor,
            }}
            className="p-5 rounded-2xl border shadow-xs space-y-4"
          >
            <div
              style={{ borderColor: borderColor }}
              className="flex items-center justify-between border-b pb-3"
            >
              <span
                style={{ color: primaryColor }}
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Deployment Requirements</span>
              </span>
              <button
                type="button"
                onClick={handleReset}
                style={{ color: textMutedColor }}
                className="text-xs hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Dates & Country Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label style={{ color: textColor }} className="block text-[11px] font-bold mb-1">
                  Destination Country *
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={{
                    backgroundColor: cardColor,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all cursor-pointer font-medium"
                  required
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color: textColor }} className="block text-[11px] font-bold mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    backgroundColor: cardColor,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label style={{ color: textColor }} className="block text-[11px] font-bold mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    backgroundColor: cardColor,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Tool Taxonomy Requirement Rows */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label style={{ color: textColor }} className="block text-[11px] font-bold mb-1">
                  Process (Top Level)
                </label>
                <select
                  value={process}
                  onChange={handleProcessChange}
                  style={{
                    backgroundColor: cardColor,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all cursor-pointer font-medium"
                >
                  <option value="">-- All Processes --</option>
                  {PROCESS_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color: textColor }} className="block text-[11px] font-bold mb-1">
                  Product Family
                </label>
                <select
                  value={productFamily}
                  onChange={handleFamilyChange}
                  style={{
                    backgroundColor: cardColor,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all cursor-pointer font-medium"
                >
                  <option value="">-- All Product Families --</option>
                  {availableFamilies.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color: textColor }} className="block text-[11px] font-bold mb-1">
                  Specific Product / Model
                </label>
                <select
                  value={specificProduct}
                  onChange={(e) => setSpecificProduct(e.target.value)}
                  style={{
                    backgroundColor: cardColor,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all cursor-pointer font-medium"
                >
                  <option value="">-- All Specific Products --</option>
                  {availableProducts.map((prod) => (
                    <option key={prod} value={prod}>
                      {prod}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Customer/Site */}
            <div>
              <label style={{ color: textColor }} className="block text-[11px] font-bold mb-1">
                Target Customer / Site (Optional)
              </label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="e.g. TSMC, Micron, Kioxia, Intel"
                style={{
                  backgroundColor: cardColor,
                  borderColor: borderColor,
                  color: textColor,
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all font-medium"
              />
            </div>

            {/* Form Action Submit Button */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: primaryColor,
                  color: textOnPrimary
                }}
                className="px-6 py-2.5 text-xs font-bold rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Matching Engineers...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Find Matching Engineers</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Match Results Output */}
          {matchData && (
            <div className="space-y-4">
              {/* Evaluated Summary Header */}
              <div
                style={{
                  backgroundColor: accentSoft,
                  borderColor: borderColor,
                }}
                className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs"
              >
                <div>
                  <span style={{ color: textColor }} className="font-bold text-sm">
                    Evaluated {matchData.total_candidates_evaluated} Total Engineers
                  </span>
                  <span style={{ color: textMutedColor }} className="block text-[11px] mt-0.5">
                    {matchData.eligible_candidates_count} available candidates passed hard schedule overlap & active status filters
                  </span>
                </div>
                <div className="text-right">
                  <span style={{ color: textMutedColor }} className="text-[11px] font-semibold">
                    Target: <strong style={{ color: textColor }}>{country}</strong> ({startDate} to {endDate})
                  </span>
                </div>
              </div>

              {/* Match List Cards */}
              {matchData.matches.length === 0 ? (
                <div
                  style={{
                    backgroundColor: cardColor,
                    borderColor: borderColor,
                    color: textMutedColor,
                  }}
                  className="p-8 text-center border rounded-xl border-dashed text-xs"
                >
                  No active engineers are available without schedule conflicts for the requested timeframe.
                </div>
              ) : (
                <div className="space-y-3">
                  {matchData.matches.map((item: EngineerMatchResultItem) => (
                    <div
                      key={item.engineer_id}
                      onClick={() => handleSelectCandidateForDeployment(item)}
                      style={{
                        backgroundColor: cardColor,
                        borderColor: borderColor,
                      }}
                      className="p-4 border rounded-xl shadow-xs space-y-3 transition-all hover:shadow-lg hover:border-slate-400 dark:hover:border-slate-500 cursor-pointer group relative"
                    >
                      {/* Card Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 style={{ color: textColor }} className="text-sm font-bold group-hover:underline">
                              {item.engineer_name}
                            </h4>
                            {item.goes_by && (
                              <span style={{ color: textMutedColor }} className="text-xs">
                                ({item.goes_by})
                              </span>
                            )}
                            <span
                              style={{ borderColor: borderColor, color: textMutedColor }}
                              className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border bg-black/5 dark:bg-white/5"
                            >
                              {item.orbit_id}
                            </span>
                          </div>
                          <div style={{ color: textMutedColor }} className="flex items-center space-x-3 text-xs mt-0.5">
                            <span>{item.company_name}</span>
                            <span>•</span>
                            <span>{item.level || 'Engineer'}</span>
                          </div>
                        </div>

                        {/* Match Badge & Score */}
                        <div className="flex flex-col items-end space-y-1">
                          {renderMatchBadge(item.match_level)}
                          <span style={{ color: textColor }} className="text-xs font-mono font-bold">
                            Match Score: {item.score}/100
                          </span>
                        </div>
                      </div>

                      {/* Tool & Visa Summaries */}
                      <div
                        style={{ borderColor: borderColor }}
                        className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {renderVisaBadge(item.visa_status)}
                          {item.primary_tool && (
                            <span
                              style={{ borderColor: borderColor, color: textColor }}
                              className="px-2 py-0.5 rounded text-[11px] border bg-black/5 dark:bg-white/5"
                            >
                              Tool: {item.primary_tool}
                            </span>
                          )}
                        </div>

                        {/* Clickable Action Button */}
                        <div
                          style={{ backgroundColor: primaryColor, color: textOnPrimary }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 group-hover:scale-105 transition-transform shrink-0 cursor-pointer"
                        >
                          <span>Create Schedule</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Reasons Checklist */}
                      {item.reasons.length > 0 && (
                        <div className="space-y-1 text-xs pt-1">
                          {item.reasons.map((r, i) => (
                            <div key={i} className="flex items-start space-x-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>{r.replace(/^✓\s*/, '')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Warnings List */}
                      {item.warnings.length > 0 && (
                        <div className="space-y-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
                          {item.warnings.map((w, i) => (
                            <div key={i} className="flex items-start space-x-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>{w.replace(/^⚠\s*/, '')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
