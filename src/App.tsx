import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useInstallGate } from "@/hooks/useInstallGate";
import Auth from "./pages/Auth.tsx";
import Home from "./pages/Home.tsx";
import Contas from "./pages/Contas.tsx";
import Receitas from "./pages/Receitas.tsx";
import Perfil from "./pages/Perfil.tsx";
import Categorias from "./pages/Categorias.tsx";
import Historico from "./pages/Historico.tsx";
import Plano from "./pages/Plano.tsx";
import HistoricoPagamentos from "./pages/HistoricoPagamentos.tsx";
import Cartoes from "./pages/Cartoes.tsx";
import Agenda from "./pages/Agenda.tsx";
import Investimentos from "./pages/Investimentos.tsx";
import ComoUsar from "./pages/ComoUsar.tsx";
import InstalarApp from "./pages/InstalarApp.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import Indicacoes from "./pages/Indicacoes.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminUsuarias from "./pages/admin/AdminUsuarias.tsx";
import AdminPagamentos from "./pages/admin/AdminPagamentos.tsx";
import AdminSaques from "./pages/admin/AdminSaques.tsx";
import AdminConfiguracoes from "./pages/admin/AdminConfiguracoes.tsx";
import NotFound from "./pages/NotFound.tsx";
import { TutorialPopup } from "./components/TutorialPopup";
import { useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

/**
 * Gate global: se o usuário está em mobile e o app NÃO está instalado como PWA,
 * substitui TODA a interface pela tela de instalação obrigatória.
 * Exceções: rotas /admin/* (uso desktop) e /instalar (a própria tela).
 */
function AppRoutes() {
  const { mustInstall } = useInstallGate();
  const { user } = useAuth();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isInstallRoute = location.pathname === "/instalar";
  const isAuthRoute = location.pathname === "/auth";
  const isLandingRoute = location.pathname === "/landingpage";

  if (mustInstall && !isAdminRoute && !isInstallRoute && !isLandingRoute) {
    return <InstalarApp />;
  }

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/instalar" element={<InstalarApp />} />
        <Route path="/landingpage" element={<LandingPage />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/index" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/contas" element={<ProtectedRoute><Contas /></ProtectedRoute>} />
        <Route path="/receitas" element={<ProtectedRoute><Receitas /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
        <Route path="/categorias" element={<ProtectedRoute><Categorias /></ProtectedRoute>} />
        <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
        <Route path="/plano" element={<ProtectedRoute><Plano /></ProtectedRoute>} />
        <Route path="/historico-pagamentos" element={<ProtectedRoute><HistoricoPagamentos /></ProtectedRoute>} />
        <Route path="/cartoes" element={<ProtectedRoute><Cartoes /></ProtectedRoute>} />
        <Route path="/investimentos" element={<ProtectedRoute><Investimentos /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
        <Route path="/como-usar" element={<ProtectedRoute><ComoUsar /></ProtectedRoute>} />
        <Route path="/indicacoes" element={<ProtectedRoute><Indicacoes /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/usuarias" element={<AdminUsuarias />} />
        <Route path="/admin/pagamentos" element={<AdminPagamentos />} />
        <Route path="/admin/saques" element={<AdminSaques />} />
        <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user && !isAuthRoute && !isAdminRoute && !isInstallRoute && <TutorialPopup />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>

);

export default App;
