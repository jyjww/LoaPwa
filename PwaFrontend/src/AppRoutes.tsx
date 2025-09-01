// src/AppRoutes.tsx
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AuctionHouse from './pages/AuctionHouse';
import Market from './pages/Market';
import Favorites from './pages/Favorites';
import NotFound from './pages/NotFound';
import Login from './pages/login/Login';
import LoginSuccess from './pages/login/LoginSuccess';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/auction" element={<AuctionHouse />} />
      <Route path="/market" element={<Market />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/success" element={<LoginSuccess />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
