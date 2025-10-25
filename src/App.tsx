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
import DigitalDiagnosticsHub from "./pages/DigitalDiagnosticsHub";
import MedicoLegalCaseAutomation from "./pages/MedicoLegalCaseAutomation";
import AmbulanceDispatchManagement from "./pages/AmbulanceDispatchManagement";
import DietNutritionManagement from "./pages/DietNutritionManagement";
import KitchenFoodService from "./pages/KitchenFoodService";
import OccupationalTherapyModule from "./pages/OccupationalTherapyModule";
import PhysioScheduling from "./pages/PhysioScheduling";
import ICUDashboard from "./pages/ICUDashboard";
import WardManagement from "./pages/WardManagement";
import PatientPorterSystem from "./pages/PatientPorterSystem";
import DischargeAutomation from "./pages/DischargeAutomation";
import ComplaintIssueTracker from "./pages/ComplaintIssueTracker";
import OrganTransplantCaseManagement from "./pages/OrganTransplantCaseManagement";
import OperationsQualityDashboard from "./pages/OperationsQualityDashboard";
import CorporateClaimsManagement from "./pages/CorporateClaimsManagement";
import PharmacovigilanceADR from "./pages/PharmacovigilanceADR";
import AINCDChatbot from "./pages/AINCDChatbot";
import SubmitComplaint from "./pages/SubmitComplaint";

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
            <Route path="/diagnostics/hub" element={<DigitalDiagnosticsHub />} />
            <Route path="/legal/mlc" element={<MedicoLegalCaseAutomation />} />
            <Route path="/ambulance/dispatch" element={<AmbulanceDispatchManagement />} />
            <Route path="/nutrition/diet" element={<DietNutritionManagement />} />
            <Route path="/kitchen/service" element={<KitchenFoodService />} />
            <Route path="/rehab/ot" element={<OccupationalTherapyModule />} />
            <Route path="/physio/scheduling" element={<PhysioScheduling />} />
            <Route path="/icu/dashboard" element={<ICUDashboard />} />
            <Route path="/wards/management" element={<WardManagement />} />
            <Route path="/porter/system" element={<PatientPorterSystem />} />
            <Route path="/discharge/automation" element={<DischargeAutomation />} />
            <Route path="/complaints/tracker" element={<ComplaintIssueTracker />} />
            <Route path="/transplant/cases" element={<OrganTransplantCaseManagement />} />
            <Route path="/operations/quality" element={<OperationsQualityDashboard />} />
            <Route path="/corporate/claims" element={<CorporateClaimsManagement />} />
            <Route path="/pharma/adr" element={<PharmacovigilanceADR />} />
            <Route path="/ai/ncd-chatbot" element={<AINCDChatbot />} />
            <Route path="/complaints/submit" element={<SubmitComplaint />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
