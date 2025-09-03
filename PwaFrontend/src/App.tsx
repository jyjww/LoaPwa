import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Header from './pages/global/Header';
import AppRoutes from './AppRoutes';
import TokenRefresh from '@/utils/tokenRefresh';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Header />
        <AppRoutes />
        <TokenRefresh />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
