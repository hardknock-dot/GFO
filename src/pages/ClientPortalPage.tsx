import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useClientOverview,
  useClientCompanies,
  useClientWorkforce,
  useClientExpertise,
  useClientDeployments,
  useClientGeography,
  useClientCompanyDetail,
} from '../hooks/useClientPortal';
import { ClientHeader } from '../components/client/ClientHeader';
import { ClientKpiSection } from '../components/client/ClientKpiSection';
import { ClientCompanyShowcase } from '../components/client/ClientCompanyShowcase';
import { ClientWorkforceSection } from '../components/client/ClientWorkforceSection';
import { ClientExpertiseSection } from '../components/client/ClientExpertiseSection';
import { ClientDeploymentSection } from '../components/client/ClientDeploymentSection';
import { ClientGeographySection } from '../components/client/ClientGeographySection';
import { ClientCompanyDetailModal } from '../components/client/ClientCompanyDetailModal';
import {
  Building2,
  Users,
  Cpu,
  CalendarDays,
  Globe2,
  LayoutDashboard,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Award,
} from 'lucide-react';

type TabKey = 'overview' | 'companies' | 'workforce' | 'expertise' | 'deployments' | 'geography';

export const ClientPortalPage: React.FC = () => {
  const { companyId: routeCompanyId } = useParams<{ companyId?: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [presentationMode, setPresentationMode] = useState<boolean>(false);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('');
  const [detailModalCompanyId, setDetailModalCompanyId] = useState<string | null>(
    routeCompanyId || null
  );

  // If route has companyId, open detail modal
  useEffect(() => {
    if (routeCompanyId) {
      setDetailModalCompanyId(routeCompanyId);
    }
  }, [routeCompanyId]);

  // Fetch API queries
  const { data: overviewData } = useClientOverview(selectedCompanyFilter || undefined);
  const { data: companiesData } = useClientCompanies();
  const { data: workforceData } = useClientWorkforce(selectedCompanyFilter || undefined);
  const { data: expertiseData } = useClientExpertise(selectedCompanyFilter || undefined);
  const { data: deploymentsData } = useClientDeployments(selectedCompanyFilter || undefined);
  const { data: geographyData } = useClientGeography(selectedCompanyFilter || undefined);
  const { data: companyDetailData, isLoading: isDetailLoading } = useClientCompanyDetail(
    detailModalCompanyId || undefined
  );

  const handleOpenCompanyDetail = (companyId: string) => {
    setDetailModalCompanyId(companyId);
  };

  const handleCloseCompanyDetail = () => {
    setDetailModalCompanyId(null);
    if (routeCompanyId) {
      navigate('/client');
    }
  };

  const authorizedCompanies = overviewData?.authorized_companies || [];
  const companiesList = companiesData || overviewData?.companies || [];

  const navTabs: { id: TabKey; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    {
      id: 'overview',
      label: 'Executive Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'companies',
      label: 'Companies & Operations',
      icon: <Building2 className="w-4 h-4" />,
      badge: overviewData?.kpi.companies_served,
    },
    {
      id: 'workforce',
      label: 'Engineering Workforce',
      icon: <Users className="w-4 h-4" />,
      badge: overviewData?.kpi.total_engineers,
    },
    {
      id: 'expertise',
      label: 'Technology & Tool Expertise',
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      id: 'deployments',
      label: 'Deployment Experience',
      icon: <CalendarDays className="w-4 h-4" />,
      badge: overviewData?.kpi.total_deployments,
    },
    {
      id: 'geography',
      label: 'Global Presence',
      icon: <Globe2 className="w-4 h-4" />,
      badge: overviewData?.kpi.countries_covered,
    },
  ];

  return (
    <div className={`min-h-screen bg-[#F4F5F7] dark:bg-slate-950 text-stone-800 dark:text-stone-100 flex flex-col font-sans selection:bg-[#606C38] selection:text-white ${presentationMode ? 'presentation-mode' : ''}`}>
      {/* Top Bar Header */}
      <ClientHeader
        presentationMode={presentationMode}
        onTogglePresentationMode={() => setPresentationMode(!presentationMode)}
        authorizedCompanies={authorizedCompanies}
        selectedCompanyId={selectedCompanyFilter}
        onSelectCompany={(id) => setSelectedCompanyFilter(id)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Presentation / Executive Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#283618] via-[#384a24] to-[#283618] border border-[#606C38]/50 p-6 sm:p-10 shadow-xl text-white">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-[#DDA15E]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-[#606C38]/25 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#FEFAE0]/15 border border-[#DDA15E]/40 text-[#FEFAE0] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#DDA15E]" />
                <span>Executive Capability & Operations Master Showcase</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#FEFAE0] tracking-tight leading-tight">
                Engineering Operations Overview
              </h1>
              <p className="text-sm sm:text-base text-[#FEFAE0]/90 font-normal leading-relaxed">
                Orbit & Skyline provides premier field engineering, tool installation, commissioning,
                and process maintenance capabilities to global semiconductor equipment leaders.
              </p>
            </div>

            {/* Quick Badges */}
            <div className="flex flex-wrap md:flex-col gap-3 justify-start md:items-end">
              <div className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-[#384a24]/90 border border-[#606C38]/60 backdrop-blur-sm text-xs text-[#FEFAE0]">
                <ShieldCheck className="w-4 h-4 text-[#DDA15E]" />
                <span className="font-medium">Enterprise Read-Only Portal</span>
              </div>
              <div className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-[#384a24]/90 border border-[#606C38]/60 backdrop-blur-sm text-xs text-[#FEFAE0]">
                <Award className="w-4 h-4 text-[#FEFAE0]" />
                <span className="font-medium">Master Operational Records</span>
              </div>
            </div>
          </div>

          {/* KPI Cards Strip */}
          {overviewData?.kpi && (
            <div className="mt-8 pt-6 border-t border-[#606C38]/50">
              <ClientKpiSection kpi={overviewData.kpi} presentationMode={presentationMode} />
            </div>
          )}
        </section>

        {/* Navigation Tabs Bar */}
        {!presentationMode && (
          <nav className="flex items-center space-x-1.5 overflow-x-auto pb-2 border-b border-[#E6E2C8] dark:border-slate-800 text-sm font-semibold scrollbar-none">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#606C38] text-[#FEFAE0] shadow-md shadow-[#606C38]/20 ring-1 ring-[#DDA15E]/40 font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-[#283618] dark:hover:text-white hover:bg-[#E6E2C8]/50 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-[#283618] text-[#FEFAE0]'
                          : 'bg-[#E6E2C8] dark:bg-slate-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Presentation Mode Tab Bar (Compact & Sleek) */}
        {presentationMode && (
          <div className="sticky top-20 z-30 bg-[#283618]/95 backdrop-blur-md p-2 rounded-2xl border border-[#606C38] flex items-center justify-between shadow-2xl">
            <div className="flex items-center space-x-2 overflow-x-auto">
              {navTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#606C38] text-[#FEFAE0] shadow-md border border-[#DDA15E]/50'
                      : 'text-[#FEFAE0]/70 hover:text-[#FEFAE0] hover:bg-[#384a24]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-[#DDA15E] font-bold px-3 py-1 bg-[#DDA15E]/15 border border-[#DDA15E]/30 rounded-xl hidden sm:block">
              Presentation Mode Active
            </div>
          </div>
        )}

        {/* Tab Content Panels */}
        <div className="space-y-10">
          {/* TAB: OVERVIEW (Combined Showcase) */}
          {activeTab === 'overview' && (
            <div className="space-y-10">
              {/* Companies Highlight */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#283618] dark:text-[#FEFAE0]">Supported Semiconductor Leaders</h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      OEM companies and partner ecosystems supported by Orbit & Skyline
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('companies')}
                    className="text-xs font-semibold text-[#606C38] dark:text-[#DDA15E] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View All Companies</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ClientCompanyShowcase
                  companies={companiesList}
                  onSelectCompany={(comp) => handleOpenCompanyDetail(comp.company_id)}
                  presentationMode={presentationMode}
                />
              </section>

              {/* Workforce & Expertise Summary Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {workforceData && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-[#283618] dark:text-[#FEFAE0]">Workforce Distribution</h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400">Engineers by Status & Technical Tier</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('workforce')}
                        className="text-xs font-semibold text-[#606C38] dark:text-[#DDA15E] hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <ClientWorkforceSection workforce={workforceData} presentationMode={presentationMode} />
                  </section>
                )}

                {expertiseData && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-[#283618] dark:text-[#FEFAE0]">Core Technology Capability</h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400">Process & Tool Families</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('expertise')}
                        className="text-xs font-semibold text-[#606C38] dark:text-[#DDA15E] hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <ClientExpertiseSection expertise={expertiseData} presentationMode={presentationMode} />
                  </section>
                )}
              </div>

              {/* Deployment & Geography Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {deploymentsData && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-[#283618] dark:text-[#FEFAE0]">Deployment Telemetry</h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400">Mission duration & operational metrics</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('deployments')}
                        className="text-xs font-semibold text-[#606C38] dark:text-[#DDA15E] hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <ClientDeploymentSection deployments={deploymentsData} presentationMode={presentationMode} />
                  </section>
                )}

                {geographyData && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-[#283618] dark:text-[#FEFAE0]">Global Footprint</h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400">Deployments across international fabs</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('geography')}
                        className="text-xs font-semibold text-[#606C38] dark:text-[#DDA15E] hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <ClientGeographySection
                      geography={geographyData}
                      totalEngineers={overviewData?.kpi.total_engineers || 0}
                      presentationMode={presentationMode}
                    />
                  </section>
                )}
              </div>
            </div>
          )}

          {/* TAB: COMPANIES */}
          {activeTab === 'companies' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#283618] dark:text-[#FEFAE0]">Companies & Supported Operations</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Semiconductor equipment manufacturers and programs supported by Orbit & Skyline's
                  field engineers.
                </p>
              </div>
              <ClientCompanyShowcase
                companies={companiesList}
                onSelectCompany={(comp) => handleOpenCompanyDetail(comp.company_id)}
                presentationMode={presentationMode}
              />
            </div>
          )}

          {/* TAB: WORKFORCE */}
          {activeTab === 'workforce' && workforceData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#283618] dark:text-[#FEFAE0]">Engineering Workforce Overview</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Aggregate distribution of certified field engineers, operational statuses, and
                  technical competency tiers.
                </p>
              </div>
              <ClientWorkforceSection workforce={workforceData} presentationMode={presentationMode} />
            </div>
          )}

          {/* TAB: EXPERTISE */}
          {activeTab === 'expertise' && expertiseData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#283618] dark:text-[#FEFAE0]">Technology & Tool Expertise</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Engineers trained, experienced, and certified across Lam Research, Axcelis ION,
                  and other semiconductor equipment platforms.
                </p>
              </div>
              <ClientExpertiseSection expertise={expertiseData} presentationMode={presentationMode} />
            </div>
          )}

          {/* TAB: DEPLOYMENTS */}
          {activeTab === 'deployments' && deploymentsData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#283618] dark:text-[#FEFAE0]">Deployment Experience & Duration</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Historical operational assignments, mission duration buckets, and multi-year
                  deployment trends.
                </p>
              </div>
              <ClientDeploymentSection deployments={deploymentsData} presentationMode={presentationMode} />
            </div>
          )}

          {/* TAB: GEOGRAPHY */}
          {activeTab === 'geography' && geographyData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#283618] dark:text-[#FEFAE0]">Global Engineering Presence</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Country-level footprint of international semiconductor fab deployments.
                </p>
              </div>
              <ClientGeographySection
                geography={geographyData}
                totalEngineers={overviewData?.kpi.total_engineers || 0}
                presentationMode={presentationMode}
              />
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal for Selected Company */}
      <ClientCompanyDetailModal
        isOpen={Boolean(detailModalCompanyId)}
        data={companyDetailData || null}
        onClose={handleCloseCompanyDetail}
        isLoading={isDetailLoading}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E6E2C8] dark:border-slate-800 bg-white dark:bg-slate-950 py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Orbit & Skyline Semiconductor Engineering. All rights reserved.</span>
          <span className="text-[11px] text-stone-400">Master Executive Presentation Layer &bull; Read-Only</span>
        </div>
      </footer>
    </div>
  );
};
