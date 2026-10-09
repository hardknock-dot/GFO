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
  Briefcase,
  Globe2,
  LayoutDashboard,
  ShieldCheck,
  Award,
  ChevronRight,
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';

type TabKey = 'overview' | 'companies' | 'workforce' | 'expertise' | 'deployments' | 'geography';

export const ClientPortalPage: React.FC = () => {
  const { currentCompany, setCompany } = useCompany();
  const activeCompanyId = currentCompany?.company_id || currentCompany?.id || '';

  const { companyId: routeCompanyId } = useParams<{ companyId?: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [presentationMode, setPresentationMode] = useState<boolean>(false);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>(activeCompanyId || '');
  const [detailModalCompanyId, setDetailModalCompanyId] = useState<string | null>(
    routeCompanyId || null
  );

  useEffect(() => {
    if (activeCompanyId && !selectedCompanyFilter) {
      setSelectedCompanyFilter(activeCompanyId);
    }
  }, [activeCompanyId]);

  // If route has companyId, open detail modal
  useEffect(() => {
    if (routeCompanyId) {
      setDetailModalCompanyId(routeCompanyId);
    }
  }, [routeCompanyId]);

  // Fetch API queries
  const { data: overviewData } = useClientOverview(selectedCompanyFilter || undefined);
  const { data: companiesData } = useClientCompanies();
  const { data: workforceData, isLoading: isLoadingWorkforce } = useClientWorkforce(selectedCompanyFilter || undefined);
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
      icon: <Briefcase className="w-4 h-4" />,
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
    <div className={`min-h-screen bg-[#F6F8FB] text-[#172033] flex flex-col font-sans selection:bg-[#3B82C4] selection:text-white ${presentationMode ? 'presentation-mode' : ''}`}>
      {/* 1. Header */}
      <ClientHeader
        presentationMode={presentationMode}
        onTogglePresentationMode={() => setPresentationMode(!presentationMode)}
        authorizedCompanies={authorizedCompanies}
        selectedCompanyId={selectedCompanyFilter}
        onSelectCompany={(id) => {
          setSelectedCompanyFilter(id);
          if (id) setCompany(id);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-8">
        {/* 2. Hero / Introduction Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-[#172B4D] border border-[#E2E8F0] p-6 sm:p-10 shadow-lg text-white">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-[#3B82C4]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-[#6B9080]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#EBF3FB] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#3B82C4] animate-pulse" />
                <span>Executive Operations & Capability Showcase</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Engineering Operations Overview
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-slate-300 font-normal leading-relaxed">
                Orbit & Skyline provides premier field engineering, tool installation, commissioning,
                and process maintenance capabilities to global semiconductor equipment leaders.
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap md:flex-col gap-2.5 justify-start md:items-end">
              <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs text-xs text-white">
                <ShieldCheck className="w-4 h-4 text-[#3B82C4]" />
                <span className="font-medium">Enterprise Read-Only Portal</span>
              </div>
              <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs text-xs text-white">
                <Award className="w-4 h-4 text-[#6B9080]" />
                <span className="font-medium">Authoritative Operational Data</span>
              </div>
            </div>
          </div>

          {/* 3. Executive KPI Row */}
          {overviewData?.kpi && (
            <div className="mt-8 pt-6 border-t border-white/15">
              <ClientKpiSection kpi={overviewData.kpi} presentationMode={presentationMode} />
            </div>
          )}
        </section>

        {/* 4. Navigation / Section Tabs */}
        {!presentationMode && (
          <nav className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-[#E2E8F0] text-xs sm:text-sm font-semibold scrollbar-none">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#172B4D] text-white shadow-xs font-bold'
                      : 'text-[#64748B] hover:text-[#172B4D] hover:bg-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-[#3B82C4] text-white'
                          : 'bg-[#E2E8F0] text-[#172B4D]'
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

        {/* Presentation Mode Compact Header Bar */}
        {presentationMode && (
          <div className="sticky top-24 z-30 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-[#E2E8F0] flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              {navTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#172B4D] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#172B4D] hover:bg-[#F6F8FB]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-[#3B82C4] font-bold px-3 py-1 bg-[#EBF3FB] border border-[#3B82C4]/20 rounded-xl hidden sm:block shrink-0">
              Presentation Mode
            </div>
          </div>
        )}

        {/* Tab Panels */}
        <div className="space-y-10">
          {/* TAB: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-10">
              {/* Companies & Operations Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#172B4D]">Supported Semiconductor OEM Leaders</h2>
                    <p className="text-xs text-[#64748B]">
                      Dedicated semiconductor manufacturing equipment programs supported by Orbit & Skyline
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('companies')}
                    className="text-xs font-semibold text-[#3B82C4] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View All Programs</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ClientCompanyShowcase
                  companies={companiesList}
                  onSelectCompany={(comp) => handleOpenCompanyDetail(comp.company_id)}
                  presentationMode={presentationMode}
                />
              </section>

              {/* Engineering Workforce - Full Width Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#172B4D]">Engineering Workforce</h2>
                    <p className="text-xs text-[#64748B]">Capacity status and technical tier distribution</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('workforce')}
                    className="text-xs font-semibold text-[#3B82C4] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {isLoadingWorkforce ? (
                  <div className="p-8 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0] shadow-xs animate-pulse">
                    Loading engineering workforce metrics...
                  </div>
                ) : workforceData ? (
                  <ClientWorkforceSection workforce={workforceData} presentationMode={presentationMode} />
                ) : null}
              </section>

              {/* Technology & Tool Expertise - Full Width Section */}
              {expertiseData && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-[#172B4D]">Technology & Tool Expertise</h2>
                      <p className="text-xs text-[#64748B]">Process domains & equipment certifications</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('expertise')}
                      className="text-xs font-semibold text-[#3B82C4] hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ClientExpertiseSection expertise={expertiseData} presentationMode={presentationMode} />
                </section>
              )}

              {/* Deployment Experience - Full Width Section */}
              {deploymentsData && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-[#172B4D]">Deployment Experience</h2>
                      <p className="text-xs text-[#64748B]">Mission duration and deployment history</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('deployments')}
                      className="text-xs font-semibold text-[#3B82C4] hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ClientDeploymentSection deployments={deploymentsData} presentationMode={presentationMode} />
                </section>
              )}

              {/* Global Presence - Full Width Section */}
              {geographyData && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-[#172B4D]">Global Presence</h2>
                      <p className="text-xs text-[#64748B]">Deployments across international semiconductor fabs</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('geography')}
                      className="text-xs font-semibold text-[#3B82C4] hover:underline flex items-center space-x-1 cursor-pointer"
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
          )}

          {/* TAB: COMPANIES & OPERATIONS */}
          {activeTab === 'companies' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#172B4D]">Companies & Supported Operations</h2>
                <p className="text-xs text-[#64748B] mt-1">
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
          {activeTab === 'workforce' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#172B4D]">Engineering Workforce</h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Aggregate distribution of certified field engineers, operational readiness, and
                  technical competency tiers.
                </p>
              </div>
              {isLoadingWorkforce ? (
                <div className="p-12 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0] shadow-xs animate-pulse">
                  Loading engineering workforce data...
                </div>
              ) : workforceData ? (
                <ClientWorkforceSection workforce={workforceData} presentationMode={presentationMode} />
              ) : (
                <div className="p-12 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
                  No workforce data found for the selected company.
                </div>
              )}
            </div>
          )}

          {/* TAB: EXPERTISE */}
          {activeTab === 'expertise' && expertiseData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#172B4D]">Technology & Tool Expertise</h2>
                <p className="text-xs text-[#64748B] mt-1">
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
                <h2 className="text-xl font-bold text-[#172B4D]">Deployment Experience</h2>
                <p className="text-xs text-[#64748B] mt-1">
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
                <h2 className="text-xl font-bold text-[#172B4D]">Global Presence</h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Standardized country-level footprint of international semiconductor fab deployments.
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

      {/* 10. Footer */}
      <footer className="mt-auto border-t border-[#E2E8F0] bg-white py-6 text-center text-xs text-[#64748B]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Orbit & Skyline Semiconductor Engineering. All rights reserved.</span>
          <span className="text-[11px] text-[#3B82C4] font-medium">Executive Presentation Layer &bull; Read-Only</span>
        </div>
      </footer>
    </div>
  );
};
