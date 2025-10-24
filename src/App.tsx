import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Appointments from "./pages/Appointments";
import Vitals from "./pages/Vitals";
import Emergency from "./pages/Emergency";
import Beds from "./pages/Beds";
import Feedback from "./pages/Feedback";
import Reports from "./pages/Reports";
import Pharmacy from "./pages/Pharmacy";
import AppointmentBooking from "./pages/AppointmentBooking";
import QueueDisplay from "./pages/QueueDisplay";
import OfflineSync from "./pages/OfflineSync";
import ComplaintSubmit from "./pages/ComplaintSubmit";
import ComplaintDashboard from "./pages/ComplaintDashboard";
import ComplaintDetails from "./pages/ComplaintDetails";
import EPrescription from "./pages/EPrescription";
import NotFound from "./pages/NotFound";
import XrayAnalysis from "./pages/XrayAnalysis";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/appointment/book" element={<AppointmentBooking />} />
            <Route path="/appointment/queue" element={<QueueDisplay />} />
            <Route path="/appointment/offline" element={<OfflineSync />} />
            <Route path="/e-prescription" element={<EPrescription />} />
            <Route path="/complaints/submit" element={<ComplaintSubmit />} />
            <Route path="/complaints/dashboard" element={<ComplaintDashboard />} />
            <Route path="/complaints/:id" element={<ComplaintDetails />} />
            <Route path="/vitals" element={<Vitals />} />
            <Route path="/emergency" element={<Emergency />} />
            <Route path="/beds" element={<Beds />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/pharmacy" element={<Pharmacy />} />
            <Route path="/ai/xray" element={<XrayAnalysis />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
