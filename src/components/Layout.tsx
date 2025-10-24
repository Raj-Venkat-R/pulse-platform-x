import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Activity, 
  AlertCircle, 
  Bed, 
  FileText, 
  MessageSquare,
  Settings,
  Menu,
  X,
  Package2,
  CalendarPlus,
  Users2,
  WifiOff,
  AlertTriangle,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Patients", path: "/patients" },
  { icon: Calendar, label: "Appointments", path: "/appointments" },
  { icon: CalendarPlus, label: "Book Appointment", path: "/appointment/book" },
  { icon: Users2, label: "Queue Display", path: "/appointment/queue" },
  { icon: AlertTriangle, label: "Complaints", path: "/complaints/dashboard" },
  { icon: ClipboardList, label: "Submit Complaint", path: "/complaints/submit" },
  { icon: Activity, label: "Vitals", path: "/vitals" },
  { icon: AlertCircle, label: "Emergency", path: "/emergency" },
  { icon: Bed, label: "Bed Management", path: "/beds" },
  { icon: MessageSquare, label: "Feedback", path: "/feedback" },
  { icon: FileText, label: "E-Prescription", path: "/e-prescription" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: FileText, label: "X-ray Analysis", path: "/ai/xray" },
  { icon: Package2, label: "Pharmacy", path: "/pharmacy" },
  { icon: WifiOff, label: "Offline Sync", path: "/appointment/offline" },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation (Drawer) */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm w-full overflow-x-hidden">
        <div className="w-full px-0 md:px-2">
          <div className="flex items-center h-14 md:h-16 gap-2">
            {/* Drawer Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85%] sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 flex flex-col gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path}>
                        <Button
                          variant={isActive(item.path) ? "default" : "ghost"}
                          className="w-full justify-start gap-2"
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Button>
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Right Side Actions */}
            <div className="ml-auto flex items-center gap-1 md:gap-2">
              <Button variant="ghost" size="icon" className="hidden md:flex">
                <Settings className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 MediCare Hospital Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
