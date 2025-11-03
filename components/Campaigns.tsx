import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { 
  Search, 
  LayoutGrid, 
  List, 
  LayoutList, 
  Maximize2,
  Plus,
  RefreshCw,
  Filter,
  Download,
  Upload,
  Settings,
  Archive,
  BarChart3,
} from 'lucide-react';
import { CampaignCard } from './CampaignCard';
import { CampaignListView } from './CampaignListView';
import { CampaignCompactView } from './CampaignCompactView';
import { CampaignImmersiveView } from './CampaignImmersiveView';
import { UserGreeting } from './UserGreeting';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'inactive';
  totalLeads: number;
  contactedLeads: number;
  successRate: number;
  dialingMethod: string;
  activeAgents: number;
  lastActivity: string;
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Ventas Q4 2025',
    status: 'active',
    totalLeads: 5000,
    contactedLeads: 3420,
    successRate: 68.2,
    dialingMethod: 'Predictivo',
    activeAgents: 12,
    lastActivity: '2025-10-24T10:30:00',
  },
  {
    id: '2',
    name: 'Retención Clientes',
    status: 'active',
    totalLeads: 2500,
    contactedLeads: 1890,
    successRate: 75.6,
    dialingMethod: 'Progresivo',
    activeAgents: 8,
    lastActivity: '2025-10-24T09:15:00',
  },
  {
    id: '3',
    name: 'Cobranza',
    status: 'paused',
    totalLeads: 3200,
    contactedLeads: 2100,
    successRate: 65.6,
    dialingMethod: 'Predictivo',
    activeAgents: 0,
    lastActivity: '2025-10-23T18:45:00',
  },
  {
    id: '4',
    name: 'Encuestas Satisfacción',
    status: 'active',
    totalLeads: 1800,
    contactedLeads: 945,
    successRate: 52.5,
    dialingMethod: 'Manual',
    activeAgents: 5,
    lastActivity: '2025-10-24T08:20:00',
  },
  {
    id: '5',
    name: 'Prospección Octubre',
    status: 'inactive',
    totalLeads: 4500,
    contactedLeads: 4350,
    successRate: 96.7,
    dialingMethod: 'Predictivo',
    activeAgents: 0,
    lastActivity: '2025-10-20T17:00:00',
  },
];

interface CampaignsProps {
  username: string;
}

export function Campaigns({ username }: CampaignsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact' | 'immersive'>('grid');

  // Get user campaigns from auth store
  const { getCampaignIds, getUser, getCampaigns: getUserCampaigns } = useAuthStore();
  const user = getUser();
  const userCampaigns = getUserCampaigns();

  // Vicibroker data states
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize campaigns with basic info from session
  useEffect(() => {
    const campaignIds = getCampaignIds();
    if (campaignIds && campaignIds.length > 0) {
      // Create placeholder campaigns with loading state
      const placeholderCampaigns: Campaign[] = userCampaigns.map(camp => ({
        id: camp.id,
        name: camp.name || camp.id,
        status: camp.active ? 'active' : 'paused',
        totalLeads: 0,
        contactedLeads: 0,
        successRate: 0,
        dialingMethod: 'Cargando...',
        activeAgents: 0,
        lastActivity: new Date().toISOString(),
      }));
      setCampaigns(placeholderCampaigns);
    }
  }, []);

  // Fetch campaigns data from backend API
  useEffect(() => {
    const fetchCampaignsData = async () => {
      try {
        console.log('[Campaigns] ========================================');
        console.log('[Campaigns] Authenticated User:', user?.name);
        console.log('[Campaigns] User Campaigns:', userCampaigns);
        console.log('[Campaigns] ========================================');

        // Get campaigns from authenticated user
        const campaignIds = getCampaignIds();

        // Validate campaigns
        if (!campaignIds || campaignIds.length === 0) {
          console.warn('[Campaigns] No campaigns available for user');
          setError('No campaigns assigned to your user');
          setLoading(false);
          return;
        }

        console.log('[Campaigns] Fetching data for campaigns:', campaignIds);

        // Fetch campaigns data from backend
        const campaignsResponse = await api.getCampaigns();

        if (campaignsResponse.success && campaignsResponse.data) {
          console.log('[Campaigns] Data received:', campaignsResponse.data.length);
          console.log('[Campaigns] Backend returned campaign IDs:', campaignsResponse.data.map((c: any) => c.campaign_id));
          console.log('[Campaigns] User has access to campaign IDs:', campaignIds);

          // Filter campaigns to only those assigned to user
          const userCampaignsData = campaignsResponse.data.filter((camp: any) =>
            campaignIds.includes(camp.campaign_id)
          );

          console.log('[Campaigns] Filtered campaigns count:', userCampaignsData.length);
          console.log('[Campaigns] Filtered campaign IDs:', userCampaignsData.map((c: any) => c.campaign_id));

          // Fetch progress for each campaign
          const transformedCampaigns: Campaign[] = await Promise.all(
            userCampaignsData.map(async (camp: any) => {
              try {
                // Fetch progress from backend
                const progressResponse = await api.getCampaignProgress(camp.campaign_id);

                const progressData = progressResponse.success && progressResponse.data
                  ? progressResponse.data
                  : { total: 0, avance: 0, porcentaje: 0 };

                return {
                  id: camp.campaign_id,
                  name: camp.campaign_name || camp.campaign_id,
                  status: camp.active === 'Y' ? 'active' : (camp.active === 'N' ? 'paused' : 'inactive'),
                  totalLeads: progressData.total || 0,
                  contactedLeads: progressData.avance || 0,
                  successRate: progressData.porcentaje || 0,
                  dialingMethod: camp.dial_method || 'Auto',
                  activeAgents: 0, // TODO: Get from active agents endpoint
                  lastActivity: new Date().toISOString(),
                };
              } catch (err) {
                console.error(`[Campaigns] Error fetching progress for ${camp.campaign_id}:`, err);
                return {
                  id: camp.campaign_id,
                  name: camp.campaign_name || camp.campaign_id,
                  status: camp.active === 'Y' ? 'active' : (camp.active === 'N' ? 'paused' : 'inactive'),
                  totalLeads: 0,
                  contactedLeads: 0,
                  successRate: 0,
                  dialingMethod: camp.dial_method || 'Auto',
                  activeAgents: 0,
                  lastActivity: new Date().toISOString(),
                };
              }
            })
          );

          setCampaigns(transformedCampaigns);
          setError(null);
        } else {
          console.warn('[Campaigns] No campaign data received');
          setError('No se recibieron datos de campañas');
        }

        setLoading(false);
      } catch (err) {
        console.error('[Campaigns] Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
        setLoading(false);
        toast.error('Error al cargar campañas. Mostrando datos de prueba.');
        // Use mock data as fallback
        setCampaigns(mockCampaigns);
      }
    };

    fetchCampaignsData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchCampaignsData, 30000);

    return () => clearInterval(interval);
  }, []);

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Menú contextual general de Campañas
  const campaignsMenuItems = [
    {
      label: "Nueva Campaña",
      icon: <Plus className="w-4 h-4" />,
      action: () => {
        toast.success("Abriendo wizard de nueva campaña");
      },
    },
    {
      label: "Actualizar Lista",
      icon: <RefreshCw className="w-4 h-4" />,
      action: () => {
        toast.success("Actualizando campañas...");
      },
      separator: true,
    },
    {
      label: "Exportar Datos",
      icon: <Download className="w-4 h-4" />,
      action: () => {
        toast.success("Exportando campañas a CSV");
      },
    },
    {
      label: "Importar Campaña",
      icon: <Upload className="w-4 h-4" />,
      action: () => {
        toast.success("Abriendo importador");
      },
      separator: true,
    },
    {
      label: "Ver Archivadas",
      icon: <Archive className="w-4 h-4" />,
      action: () => {
        toast.info("Mostrando campañas archivadas");
      },
    },
    {
      label: "Configuración",
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        toast.info("Abriendo configuración de campañas");
      },
      separator: true,
    },
    {
      label: "Reportes Avanzados",
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => {
        toast.info("Abriendo módulo de reportes");
      },
    },
  ];

  return (
    <div className="flex flex-col h-full">
        {/* Header - Static */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between gap-8">
            <div>
              <h1 className="text-slate-900 mb-2">Campañas</h1>
              <p className="text-slate-600">
                Gestiona y monitorea todas tus campañas de Vicidial
                <span className="ml-2 text-slate-400">
                  • Clic derecho para más opciones
                </span>
              </p>
            </div>
            <div className="flex-shrink-0">
              <UserGreeting username={username} />
            </div>
          </div>
        </div>

      {/* Filters and View Switcher - Static */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between flex-shrink-0 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar campañas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="paused">Pausadas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="grid" className="px-3" aria-label="Vista de tarjetas">
              <LayoutGrid className="w-4 h-4" />
              <span className="sr-only">Tarjetas</span>
            </TabsTrigger>
            
            <TabsTrigger value="list" className="px-3" aria-label="Vista de lista">
              <List className="w-4 h-4" />
              <span className="sr-only">Lista</span>
            </TabsTrigger>
            
            <TabsTrigger value="compact" className="px-3" aria-label="Vista compacta">
              <LayoutList className="w-4 h-4" />
              <span className="sr-only">Compacto</span>
            </TabsTrigger>
            
            <TabsTrigger value="immersive" className="px-3" aria-label="Vista inmersiva">
              <Maximize2 className="w-4 h-4" />
              <span className="sr-only">Inmersivo</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Campaign Views - Scrollable Area */}
      <div className="flex-1 overflow-auto min-h-0">
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="pb-6">
            <CampaignListView campaigns={filteredCampaigns} />
          </div>
        )}

        {viewMode === 'compact' && (
          <div className="pb-6">
            <CampaignCompactView campaigns={filteredCampaigns} />
          </div>
        )}

        {viewMode === 'immersive' && (
          <CampaignImmersiveView campaigns={filteredCampaigns} />
        )}

        {!loading && filteredCampaigns.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed">
            <p className="text-slate-600">
              {searchTerm || statusFilter !== 'all'
                ? 'No se encontraron campañas con los filtros aplicados'
                : 'No hay campañas disponibles'}
            </p>
          </div>
        )}

        {loading && filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">Cargando campañas...</p>
          </div>
        )}
      </div>
    </div>
  );
}
