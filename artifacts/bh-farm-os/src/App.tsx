import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/error-boundary';
import { FarmShell } from '@/components/farm-shell';
import { AlertsPage, DashboardPage, FarmMapPage, FinancePage, GoatsPage, InventoryPage, LivestockPage, PoultryPage, SearchPage, TasksPage, TodayPage } from '@/pages/farm-pages';
import NotFound from '@/pages/not-found';
import { Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <FarmShell><RoutedErrorBoundary><Switch>
    <Route path="/" component={DashboardPage} />
    <Route path="/today" component={TodayPage} />
    <Route path="/farm-map" component={FarmMapPage} />
    <Route path="/livestock" component={LivestockPage} />
    <Route path="/livestock/goats" component={GoatsPage} />
    <Route path="/livestock/poultry" component={PoultryPage} />
    <Route path="/inventory" component={InventoryPage} />
    <Route path="/tasks" component={TasksPage} />
    <Route path="/finance" component={FinancePage} />
    <Route path="/alerts" component={AlertsPage} />
    <Route path="/search" component={SearchPage} />
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary></FarmShell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;