import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CompanyProvider } from './context/CompanyContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';

import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { CompanySelectionPage } from './pages/CompanySelectionPage';
import { DashboardPage } from './pages/DashboardPage';
import { AllDataPage } from './pages/AllDataPage';
import { EngineerSearchPage } from './pages/EngineerSearchPage';
import { EngineersPage } from './pages/EngineersPage';
import { EngineerProfilePage } from './pages/EngineerProfilePage';
import { SchedulePage } from './pages/SchedulePage';
import { ScheduleCommentsPage } from './pages/ScheduleCommentsPage';

import { SkillsPage } from './pages/SkillsPage';
import { TravelPage } from './pages/TravelPage';
import { VisaPage } from './pages/VisaPage';
import { PerformancePage } from './pages/PerformancePage';
import { LeavesPage } from './pages/LeavesPage';
import { MissedSchedulesPage } from './pages/MissedSchedulesPage';
import { ReportsPage } from './pages/ReportsPage';
import { UploadPage } from './pages/UploadPage';
import { OperationalAlertsPage } from './pages/OperationalAlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { DeleteRequestsPage } from './pages/DeleteRequestsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { ServerErrorPage } from './pages/ServerErrorPage';
import { OfflinePage } from './pages/OfflinePage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { EngineerDashboardPage } from './pages/EngineerDashboardPage';

import {
  GuestRoute,
  ProtectedRoute,
  ManagerRoute,
  ViewerRoute,
  EngineerRoute,
  NonEngineerRoute,
  RoleGuard,
} from './components/common/RouteGuards';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CompanyProvider>
          <ThemeProvider>
            <AuthProvider>
              <UserProvider>
                <BrowserRouter>
                  <Routes>
                    {/* Public Authentication Routes */}
                    <Route element={<GuestRoute />}>
                      <Route path="/" element={<LoginPage />} />
                    </Route>

                    {/* Main App Layout Persistent Routes */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/company-selection" element={<CompanySelectionPage />} />
                      <Route element={<AppLayout />}>
                        {/* Main Admin Legacy Redirect */}
                        <Route path="/admin" element={<Navigate to="/users" replace />} />

                        {/* Dedicated Engineer Self-Service Routes */}
                        <Route element={<EngineerRoute />}>
                          <Route path="/engineer/dashboard" element={<EngineerDashboardPage />} />
                          <Route path="/engineer/profile" element={<EngineerProfilePage />} />
                        </Route>

                        {/* Non-Engineer / Company-Wide Administrative Routes */}
                        <Route element={<NonEngineerRoute />}>
                          <Route path="/dashboard" element={<DashboardPage />} />
                          <Route path="/all-data" element={<AllDataPage />} />
                          <Route path="/engineer-search" element={<EngineerSearchPage />} />

                          {/* Viewer & Operational Access */}
                          <Route element={<ViewerRoute />}>
                            <Route path="/engineers" element={<EngineersPage />} />
                            <Route path="/engineers/:id" element={<EngineerProfilePage />} />
                            <Route path="/schedule" element={<SchedulePage />} />
                            <Route path="/schedule-comments" element={<ScheduleCommentsPage />} />
                            <Route path="/skills" element={<SkillsPage />} />

                            <Route path="/travel" element={<TravelPage />} />
                            <Route path="/visa" element={<VisaPage />} />
                            <Route path="/performance" element={<PerformancePage />} />
                            <Route path="/leaves" element={<LeavesPage />} />
                            <Route path="/missed-schedules" element={<MissedSchedulesPage />} />
                            <Route element={<RoleGuard allowedRoles={['Main Admin', 'Global Admin', 'Manager', 'Company Admin', 'Ops Executive', 'Resource Manager', 'Engineer', 'Field Engineer']} />}>
                              <Route path="/alerts" element={<OperationalAlertsPage />} />
                            </Route>
                            <Route path="/reports" element={<ReportsPage />} />
                          </Route>

                          {/* Delete Requests: Accessible to Ops Executive (Creation), Manager & Main Admin (Review) */}
                          <Route element={<RoleGuard allowedRoles={['Main Admin', 'Global Admin', 'Manager', 'Company Admin', 'Ops Executive']} />}>
                            <Route path="/delete-requests" element={<DeleteRequestsPage />} />
                          </Route>

                          {/* Manager & Admin Upload */}
                          <Route element={<ManagerRoute />}>
                            <Route path="/upload" element={<UploadPage />} />
                          </Route>

                          {/* Main Admin access: user management & audit */}
                          <Route element={<RoleGuard allowedRoles={['Main Admin', 'Global Admin']} />}>
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/users" element={<UserManagementPage />} />
                          </Route>
                        </Route>

                        {/* Error Handling & Status Pages */}
                        <Route path="/403" element={<ForbiddenPage />} />
                        <Route path="/500" element={<ServerErrorPage />} />
                        <Route path="/offline" element={<OfflinePage />} />
                        <Route path="/404" element={<NotFoundPage />} />
                        <Route path="*" element={<Navigate to="/404" replace />} />
                      </Route>
                    </Route>
                  </Routes>
                </BrowserRouter>
              </UserProvider>
            </AuthProvider>
          </ThemeProvider>
        </CompanyProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
