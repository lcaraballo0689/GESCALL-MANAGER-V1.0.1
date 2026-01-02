import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import {
  LayoutDashboard,
  Menu,
  User,
  LogOut,
  PhoneCall,
  X,
  Star,
  Activity,
  Music,
  ShieldBan,
  ListChecks,
  PhoneOutgoing,
  Calendar,
} from "lucide-react";
import { cn } from "./ui/utils";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { UserProfileModal } from "./UserProfileModal";
import { BackgroundTasksPanel } from "./BackgroundTasksPanel";
import { BackgroundSocketManager } from "./BackgroundSocketManager";
import { toast } from "sonner";
import logoChock from "./figma/logoChock.jpg";

interface DashboardLayoutProps {
  children: React.ReactNode;
  username: string;
  onLogout: () => void;
  onNavigate?: (menuId: string) => void;
  currentPage?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "campaigns",
    label: "Campañas",
    icon: PhoneCall,
  },
  {
    id: "audio",
    label: "Audios",
    icon: Music,
  },
  {
    id: "blacklist",
    label: "Blacklist",
    icon: ShieldBan,
  },
  {
    id: "whitelist",
    label: "Whitelist",
    icon: ListChecks,
  },
  {
    id: "callerid-pools",
    label: "CallerID Pools",
    icon: PhoneOutgoing,
  },
  {
    id: "scheduler",
    label: "Programador",
    icon: Calendar,
  },
  //
  //    id: "agents",
  //    label: "Monitor de Agentes",
  //  icon: Activity,
  // },
];

export function DashboardLayout({
  children,
  username,
  onLogout,
  onNavigate,
  currentPage = "dashboard",
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Collapsed by default
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState(false);
  const [activeMenu, setActiveMenu] = useState(currentPage);
  const [isProfileModalOpen, setIsProfileModalOpen] =
    useState(false);
  const [favoriteMenu, setFavoriteMenu] = useState<
    string | null
  >(null);

  // Load favorite menu from localStorage
  useEffect(() => {
    const savedFavorite = localStorage.getItem("favoriteMenu");
    if (savedFavorite) {
      setFavoriteMenu(savedFavorite);
    }
  }, []);

  // Sync activeMenu with currentPage
  useEffect(() => {
    setActiveMenu(currentPage);
  }, [currentPage]);

  // Handle sidebar hover
  const handleSidebarMouseEnter = () => {
    setIsSidebarOpen(true);
  };

  const handleSidebarMouseLeave = () => {
    setIsSidebarOpen(false);
  };

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(menuId);
    setIsMobileSidebarOpen(false);
    if (onNavigate) {
      onNavigate(menuId);
    }
  };

  const handleToggleFavorite = (
    menuId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation(); // Prevent menu click

    if (favoriteMenu === menuId) {
      // Remove favorite
      setFavoriteMenu(null);
      localStorage.removeItem("favoriteMenu");
      toast.success("Favorito eliminado");
    } else {
      // Set as favorite
      setFavoriteMenu(menuId);
      localStorage.setItem("favoriteMenu", menuId);
      const menuItem = menuItems.find(
        (item) => item.id === menuId,
      );
      toast.success(`${menuItem?.label} marcado como favorito`);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div
        className={cn(
          "flex items-center justify-center transition-all duration-300",
          isSidebarOpen ? "px-4 py-4" : "px-2 py-3",
        )}
      >
        <div className={cn(
          "overflow-hidden rounded-lg",
          isSidebarOpen ? "w-40 h-16" : "w-14 h-14",
        )}>
          <ImageWithFallback
            src={logoChock}
            alt="GesCall Logo"
            className={cn(
              "object-cover transition-all duration-300 scale-125",
              isSidebarOpen ? "w-full h-full" : "w-full h-full",
            )}
          />
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <TooltipProvider>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <div key={item.id}>
                {!isSidebarOpen ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={
                          activeMenu === item.id
                            ? "secondary"
                            : "ghost"
                        }
                        className="w-full justify-center px-2 relative"
                        onClick={() => handleMenuClick(item.id)}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {favoriteMenu === item.id && (
                          <div className="absolute bottom-1 right-1">
                            <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
                          </div>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <div className="flex items-center gap-2">
                        <p>{item.label}</p>
                        {favoriteMenu === item.id && (
                          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant={
                      activeMenu === item.id
                        ? "secondary"
                        : "ghost"
                    }
                    className="w-full justify-start gap-3 pr-2"
                    onClick={() => handleMenuClick(item.id)}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left">
                      {item.label}
                    </span>
                    <div
                      onClick={(e) =>
                        handleToggleFavorite(item.id, e)
                      }
                      className={cn(
                        "p-1 rounded hover:bg-slate-200/50 transition-colors duration-200 ease-out cursor-pointer",
                        favoriteMenu === item.id &&
                        "text-yellow-500",
                      )}
                    >
                      <Star
                        className={cn(
                          "w-4 h-4",
                          favoriteMenu === item.id &&
                          "fill-yellow-500",
                        )}
                      />
                    </div>
                  </Button>
                )}
              </div>
            ))}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      {/* User Section at Bottom */}
      <Separator />
      <div className="p-3">
        <TooltipProvider>
          {!isSidebarOpen ? (
            // Collapsed state - Icon buttons stacked
            <div className="space-y-2">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-center px-2"
                    onClick={() => setIsProfileModalOpen(true)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-600 text-white">
                        {username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Perfil de Usuario</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-center px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={onLogout}
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Cerrar Sesión</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            // Expanded state - Full user card
            <div className="space-y-2">
              {/* User Profile Card */}
              <div
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-200 ease-out cursor-pointer"
                onClick={() => setIsProfileModalOpen(true)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-600 text-white">
                    {username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-900 truncate">
                      {username}
                    </p>
                    {username === "desarrollo" && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0"
                      >
                        DEV
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Administrador
                  </p>
                </div>
                <User className="w-4 h-4 text-slate-400" />
              </div>

              {/* Logout Button */}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={onLogout}
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar Sesión</span>
              </Button>
            </div>
          )}
        </TooltipProvider>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen relative overflow-hidden">
      {/* Background Image - Full Screen with higher opacity */}
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80"
          alt="Snowy mountain background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-white/70" />
      </div>

      {/* Desktop Sidebar - Floating with auto-expand on hover */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/60 transition-all duration-500 ease-out m-4 mr-0 z-50 relative",
          isSidebarOpen ? "w-64" : "w-20",
        )}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Menu Toggle Button - Fixed Top Left */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50 bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/60 rounded-xl"
        onClick={() => setIsMobileSidebarOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="fixed top-4 bottom-4 left-4 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/60 z-50 md:hidden">
            <div className="flex justify-end p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative z-10">
        <div className="flex-1 overflow-auto p-6 lg:p-8 pt-16 md:pt-6">
          <div className="h-full">{children}</div>
        </div>
      </main>

      {/* Background Services */}
      <BackgroundTasksPanel />
      <BackgroundSocketManager />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        username={username}
      />
    </div>
  );
}