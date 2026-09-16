import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/error-boundary';
import { FarmShell } from '@/components/farm-shell';
import { AlertsPage, DashboardPage, FarmMapPage, FinancePage, InventoryPage, LivestockPage, SearchPage, TasksPage, TodayPage } from '@/pages/farm-pages';
import { FarmHomePage } from '@/pages/farm-home';
import RoleDashboardPage from '@/pages/role-dashboard';
import LoginPage from '@/pages/login';
import UsersPage from '@/pages/users';
import FarmSettingsPage from '@/pages/farm-settings';
import PlatformFarmsPage from '@/pages/platform-farms';
import { FarmOperationsPage } from '@/pages/farm-operations';
import GoatManagementPage from '@/pages/goat-management';
import PoultryManagementPage from '@/pages/poultry-management';
import PigManagementPage from '@/pages/pig-management';
import DemoDataPage from '@/pages/demo-data';
import { setBaseUrl } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import { Route, Router as WouterRouter, Switch, Redirect, useLocation } from 'wouter';
import { AuthProvider, useAuth } from '@/lib/auth';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
setBaseUrl(import.meta.env.VITE_API_URL || null);
function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function Operations({ type }: { type?: string }) { return <FarmOperationsPage defaultType={type} />; }
function ProtectedRouter() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center">Loading secure farm access…</div>;
  if (!user) return <Redirect to="/login" />;
  return <FarmShell><RoutedErrorBoundary><Switch>
    <Route path="/" component={RoleDashboardPage} /><Route path="/home" component={FarmHomePage} /><Route path="/users" component={UsersPage} /><Route path="/farm-settings" component={FarmSettingsPage} /><Route path="/platform/farms" component={PlatformFarmsPage} />
    <Route path="/overview" component={DashboardPage} /><Route path="/today" component={TodayPage} /><Route path="/farm-map" component={FarmMapPage} />
    <Route path="/livestock" component={LivestockPage} /><Route path="/livestock/goats" component={GoatManagementPage} /><Route path="/livestock/poultry" component={PoultryManagementPage} /><Route path="/pigs" component={PigManagementPage} />
    <Route path="/fish"><Operations type="fish" /></Route><Route path="/fish/water-quality"><Operations type="fish_water_quality" /></Route><Route path="/fields"><Operations type="field" /></Route><Route path="/crops"><Operations type="crop" /></Route><Route path="/crop-activities"><Operations type="crop_activity" /></Route><Route path="/garden"><Operations type="home_garden" /></Route><Route path="/commercial-garden"><Operations type="garden_bed" /></Route><Route path="/greenhouse"><Operations type="greenhouse" /></Route><Route path="/orchard"><Operations type="orchard_tree" /></Route><Route path="/water"><Operations type="water_tank" /></Route><Route path="/water/usage"><Operations type="water_usage" /></Route><Route path="/irrigation"><Operations type="irrigation" /></Route><Route path="/health"><Operations type="health" /></Route><Route path="/crop-health"><Operations type="crop_health" /></Route>
    <Route path="/inventory" component={InventoryPage} /><Route path="/feed"><Operations type="production" /></Route><Route path="/tasks" component={TasksPage} /><Route path="/calendar"><Operations type="calendar" /></Route><Route path="/sales"><Operations type="sale" /></Route><Route path="/expenses"><Operations type="expense" /></Route><Route path="/finance" component={FinancePage} /><Route path="/reports"><Operations type="production" /></Route><Route path="/equipment"><Operations type="equipment" /></Route><Route path="/resources"><Operations type="compost" /></Route><Route path="/farm-records"><FarmOperationsPage /></Route><Route path="/demo-data" component={DemoDataPage} /><Route path="/alerts" component={AlertsPage} /><Route path="/search" component={SearchPage} /><Route component={NotFound} />
  </Switch></RoutedErrorBoundary></FarmShell>;
}
function App() { return <QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Switch><Route path="/login" component={LoginPage} /><Route component={ProtectedRouter} /></Switch></WouterRouter><Toaster /></TooltipProvider></AuthProvider></QueryClientProvider>; }
export default App;
