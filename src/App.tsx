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
import { SkillsPage } from './pages/SkillsPage';
import { TravelPage } from './pages/TravelPage';
import { VisaPage } from './pages/VisaPage';
import { PerformancePage } from './pages/PerformancePage';
import { ReportsPage } from './pages/ReportsPage';
import { UploadPage } from './pages/UploadPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { ServerErrorPage } from './pages/ServerErrorPage';
import { OfflinePage } from './pages/OfflinePage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import {
  GuestRoute,
  ProtectedRoute,
  AdminRoute,
  ManagerRoute,
  ViewerRoute,
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
                      <Route path="/company-selection" element={<CompanySelectionPage />} />
                    </Route>

                    {/* Main App Layout Persistent Routes */}
                    <Route element={<ProtectedRoute />}>
                      <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/all-data" element={<AllDataPage />} />
                        <Route path="/engineer-search" element={<EngineerSearchPage />} />
                        
                        {/* Viewer access: engineers lists & detail profiles */}
                        <Route element={<ViewerRoute />}>
                          <Route path="/engineers" element={<EngineersPage />} />
                          <Route path="/engineers/:id" element={<EngineerProfilePage />} />
                          <Route path="/schedule" element={<SchedulePage />} />
                          <Route path="/skills" element={<SkillsPage />} />
                          <Route path="/travel" element={<TravelPage />} />
                          <Route path="/visa" element={<VisaPage />} />
                          <Route path="/performance" element={<PerformancePage />} />
                          <Route path="/reports" element={<ReportsPage />} />
                        </Route>

                        {/* Manager access: data uploads */}
                        <Route element={<ManagerRoute />}>
                          <Route path="/upload" element={<UploadPage />} />
                        </Route>

                        {/* Admin access: global workspace settings */}
                        <Route element={<AdminRoute />}>
                          <Route path="/settings" element={<SettingsPage />} />
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
