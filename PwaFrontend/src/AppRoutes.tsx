// src/AppRoutes.tsx
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AuctionHouse from './pages/AuctionHouse';
import Market from './pages/Market';
import Favorites from './pages/Favorites';
import NotFound from './pages/NotFound';
import Login from './pages/login/Login';
import LoginSuccess from './pages/login/LoginSuccess';
import PushHelp from './pages/PushHelp';
import Privacy from './pages/Privacy';

const AppRoutes = () => {
  const showLoginUI = import.meta.env.VITE_LOGIN_UI !== 'off';

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/auction" element={<AuctionHouse />} />
      <Route path="/market" element={<Market />} />
      <Route path="/favorites" element={<Favorites />} />
      {showLoginUI && <Route path="/login" element={<Login />} />}
      {showLoginUI && <Route path="/login/success" element={<LoginSuccess />} />}
      <Route path="/push-help" element={<PushHelp />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
