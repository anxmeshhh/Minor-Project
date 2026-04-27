import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VitalsProvider } from "@/context/VitalsContext";
import { ConnectionProvider } from "@/context/ConnectionContext";
import { AuthProvider } from "@/context/AuthContext";
import { HealthDataProvider } from "@/context/HealthDataContext";
import { NavBar } from "@/components/NavBar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Patient from "./pages/Patient";
import DoctorDashboard from "./pages/DoctorDashboard";
import Doctor from "./pages/Doctor";
import Emergency from "./pages/Emergency";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";
import FamilyHub from "./pages/FamilyHub";
import FamilyMembers from "./pages/FamilyMembers";
import Documents from "./pages/Documents";
import Appointments from "./pages/Appointments";
import Medications from "./pages/Medications";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound.tsx";
import DoctorDiscovery from "./pages/DoctorDiscovery";
import AdminDashboard from "./pages/AdminDashboard";
import DemoPanel from "./pages/DemoPanel";

const queryClient = new QueryClient();

const HIDE_NAV_ROUTES = new Set(["/login", "/signup"]);

function Shell() {
  const location = useLocation();
  // Show NavBar everywhere EXCEPT login/signup
  const showNav = !HIDE_NAV_ROUTES.has(location.pathname);
  return (
    <>
      {showNav && <NavBar />}
      <Routes>
        {/* ── Public routes — no auth required ── */}
        <Route path="/" element={<DemoPanel />} />          {/* Landing = Simulation Demo */}
        <Route path="/demo" element={<DemoPanel />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ── Patient routes ── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allow={["patient"]}>
              <Patient />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor"
          element={
            <ProtectedRoute allow={["doctor"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/patient/:id"
          element={
            <ProtectedRoute allow={["doctor"]}>
              <Doctor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/discovery"
          element={
            <ProtectedRoute allow={["patient"]}>
              <DoctorDiscovery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/emergency"
          element={
            <ProtectedRoute>
              <Emergency />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Family Health Hub — available to patients and admins */}
        <Route
          path="/family"
          element={
            <ProtectedRoute allow={["patient"]}>
              <FamilyHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family/members"
          element={
            <ProtectedRoute allow={["patient"]}>
              <FamilyMembers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family/documents"
          element={
            <ProtectedRoute allow={["patient"]}>
              <Documents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family/appointments"
          element={
            <ProtectedRoute allow={["patient"]}>
              <Appointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family/medications"
          element={
            <ProtectedRoute allow={["patient"]}>
              <Medications />
            </ProtectedRoute>
          }
        />
        {/* Demo / Research control panel — accessible without auth */}
        <Route path="/demo" element={<DemoPanel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ConnectionProvider>
            <VitalsProvider>
              <HealthDataProvider>
                <Shell />
              </HealthDataProvider>
            </VitalsProvider>
          </ConnectionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
