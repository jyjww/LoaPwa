import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AuctionHouse from './pages/AuctionHouse';
import Market from './pages/Market';
import Favorites from './pages/Favorites';
import NotFound from './pages/NotFound';
// import InstallPWA from './components/InstallPWA';
// import EnablePush from './components/EnablePush';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/auction" element={<AuctionHouse />} />
          <Route path="/market" element={<Market />} />
          <Route path="/favorites" element={<Favorites />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    {/* <InstallPWA />
    <EnablePush /> */}
  </QueryClientProvider>
);

export default App;
