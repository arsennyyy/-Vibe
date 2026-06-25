import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactElement } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import GoogleAuthShell from "@/components/auth/GoogleAuthShell";
import ScrollToTop from "@/components/ScrollToTop";
import { LazyMotion, domAnimation } from "framer-motion";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import Index from "./pages/Index";
import Event from "./pages/Event";
import Profile from "./pages/Profile";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import AboutPage from "./pages/about";
import ContactPage from "./pages/contact";
import FAQPage from "./pages/faq";
import TermsPage from "./pages/terms";
import PrivacyPage from "./pages/privacy";
import CookiesPage from "./pages/cookies";
import Admin from "./pages/Admin";
import AdminEventPreview from "./pages/AdminEventPreview";
import AdminSignIn from "./pages/AdminSignIn";
import ConcertsPage from './pages/ConcertsPage';
import TicketVerifyPage from "./pages/TicketVerifyPage";
import OrganizerEventBuilder from "./pages/OrganizerEventBuilder";
import EventCheckoutPage from "./pages/EventCheckoutPage";
import { useUser } from "@/contexts/UserContext";

const queryClient = new QueryClient();

const AdminRoute = ({ children }: { children: ReactElement }) => {
  const { user, isLoading } = useUser();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/50 text-sm">
        Загрузка…
      </div>
    );
  }
  if (!user || !user.isAdmin) return <Navigate to="/admin-signin" replace />;
  return children;
};

const AppRoutes = () => (
  <QueryClientProvider client={queryClient}>
    <LazyMotion features={domAnimation}>
      <TooltipProvider>
        <UserProvider>
          <ThemeProvider>
            <ConfirmProvider>
              <Toaster />
              <BrowserRouter>
                <ScrollToTop />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/event/:id" element={<Event />} />
                  <Route path="/event/:id/checkout" element={<EventCheckoutPage />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/admin-signin" element={<AdminSignIn />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/cookies" element={<CookiesPage />} />
                  <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                  <Route path="/admin/preview-event/:id" element={<AdminRoute><AdminEventPreview /></AdminRoute>} />
                  <Route path="/organizer/new-event" element={<OrganizerEventBuilder />} />
                  <Route path="/organizer/events/:id/edit" element={<OrganizerEventBuilder />} />
                  <Route path="*" element={<NotFound />} />
                  <Route path="/verify" element={<TicketVerifyPage />} />
                  <Route path="/concerts" element={<ConcertsPage />} />
                </Routes>
              </BrowserRouter>
            </ConfirmProvider>
          </ThemeProvider>
        </UserProvider>
      </TooltipProvider>
    </LazyMotion>
  </QueryClientProvider>
);

const App = () => (
  <GoogleAuthShell>
    <AppRoutes />
  </GoogleAuthShell>
);

export default App;