import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/error-boundary';
import { FarmShell } from '@/components/farm-shell';
import { AlertsPage, DashboardPage, FarmMapPage, FinancePage, GoatsPage, InventoryPage, LivestockPage, PoultryPage, SearchPage, TasksPage, TodayPage } from '@/pages/farm-pages';
import { FarmOperationsPage } from '@/pages/farm-operations';
import { setBaseUrl } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import { Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
setBaseUrl(import.meta.env.VITE_API_URL || null);

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Operations({ type }: { type?: string }) {
  return <FarmOperationsPage defaultType={type} />;
}

function Router() {
  return <FarmShell><RoutedErrorBoundary><Switch>
    <Route path="/" component={DashboardPage} />
    <Route path="/today" component={TodayPage} />
    <Route path="/farm-map" component={FarmMapPage} />
    <Route path="/livestock" component={LivestockPage} />
    <Route path="/livestock/goats" component={GoatsPage} />
    <Route path="/livestock/poultry" component={PoultryPage} />
    <Route path="/pigs"><Operations type="pig" /></Route>
    <Route path="/fish"><Operations type="fish" /></Route>
    <Route path="/fish/water-quality"><Operations type="fish_water_quality" /></Route>
    <Route path="/fields"><Operations type="field" /></Route>
    <Route path="/crops"><Operations type="crop" /></Route>
    <Route path="/crop-activities"><Operations type="crop_activity" /></Route>
    <Route path="/garden"><Operations type="home_garden" /></Route>
    <Route path="/commercial-garden"><Operations type="garden_bed" /></Route>
    <Route path="/greenhouse"><Operations type="greenhouse" /></Route>
    <Route path="/orchard"><Operations type="orchard_tree" /></Route>
    <Route path="/water"><Operations type="water_tank" /></Route>
    <Route path="/water/usage"><Operations type="water_usage" /></Route>
    <Route path="/irrigation"><Operations type="irrigation" /></Route>
    <Route path="/health"><Operations type="health" /></Route>
    <Route path="/crop-health"><Operations type="crop_health" /></Route>
    <Route path="/inventory" component={InventoryPage} />
    <Route path="/feed"><Operations type="production" /></Route>
    <Route path="/tasks" component={TasksPage} />
    <Route path="/calendar"><Operations type="calendar" /></Route>
    <Route path="/sales"><Operations type="sale" /></Route>
    <Route path="/expenses"><Operations type="expense" /></Route>
    <Route path="/finance" component={FinancePage} />
    <Route path="/reports"><Operations type="production" /></Route>
    <Route path="/equipment"><Operations type="equipment" /></Route>
    <Route path="/resources"><Operations type="compost" /></Route>
    <Route path="/farm-records" component={FarmOperationsPage} />
    <Route path="/alerts" component={AlertsPage} />
    <Route path="/search" component={SearchPage} />
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary></FarmShell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;