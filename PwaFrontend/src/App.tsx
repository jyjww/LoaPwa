import InstallPWA from './components/InstallPWA';
import EnablePush from './components/EnablePush';
import AppRoutes from './AppRoutes';
import { BrowserRouter } from 'react-router-dom';

export default function App() {
  return (
    <>
      <InstallPWA />
      <EnablePush />
      {/* 나머지 UI */}
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  );
}
