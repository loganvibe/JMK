import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { LoadingState } from "@/components/common/States";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import RefundPolicy from "./pages/RefundPolicy";
import AcademicIntegrity from "./pages/AcademicIntegrity";
import Features from "./pages/Features";
import AuthCallback from "./pages/AuthCallback";


// Route-level code splitting keeps the first load light on mobile networks.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyProjects = lazy(() => import("./pages/MyProjects"));
const ModifyProject = lazy(() => import("./pages/ModifyProject"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Profile = lazy(() => import("./pages/Profile"));
const CreateProject = lazy(() => import("./pages/CreateProject"));
const ProjectWorkspace = lazy(() => import("./pages/ProjectWorkspace"));
const RefineProject = lazy(() => import("./pages/RefineProject"));
const Billing = lazy(() => import("./pages/Billing"));
const Services = lazy(() => import("./pages/Services"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen"><LoadingState label="Loading…" /></div>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
               <Route path="/reset-password" element={<ResetPassword />} />
               <Route path="/auth/callback" element={<AuthCallback />} />
               <Route path="/features" element={<Features />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/academic-integrity" element={<AcademicIntegrity />} />

              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-projects" element={<MyProjects />} />
              <Route path="/modify-project" element={<ModifyProject />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/projects/new" element={<CreateProject />} />
              <Route path="/projects/:id" element={<ProjectWorkspace />} />
              <Route path="/refine" element={<RefineProject />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/services" element={<Services />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<Admin />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
