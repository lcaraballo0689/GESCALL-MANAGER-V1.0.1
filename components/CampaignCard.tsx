import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import {
  Phone,
  Users,
  TrendingUp,
  Clock,
  Play,
  Pause,
  Edit,
  Copy,
  FileText,
  Archive,
  Trash2,
  Settings,
  BarChart3,
  Download,
  Upload,
  Eye,
  Loader2,
} from "lucide-react";
import { CampaignDetailsModal } from "./CampaignDetailsModal";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  status: "active" | "paused" | "inactive";
  totalLeads: number;
  contactedLeads: number;
  successRate: number;
  dialingMethod: string;
  activeAgents: number;
  lastActivity: string;
}

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Check if data is still loading
  const isLoading = campaign.dialingMethod === 'Cargando...' ||
    (campaign.totalLeads === 0 && campaign.contactedLeads === 0 && campaign.successRate === 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "inactive":
        return "bg-slate-400";
      default:
        return "bg-slate-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Activa";
      case "paused":
        return "Pausada";
      case "inactive":
        return "Inactiva";
      default:
        return status;
    }
  };

  const progressPercentage = campaign.totalLeads > 0
    ? (campaign.contactedLeads / campaign.totalLeads) * 100
    : 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffMins < 1440)
      return `Hace ${Math.floor(diffMins / 60)} hrs`;
    return `Hace ${Math.floor(diffMins / 1440)} días`;
  };

  // Menú contextual para cada campaña
  const campaignMenuItems = [
    {
      label: "Ver Detalles",
      icon: <Eye className="w-4 h-4" />,
      action: () => {
        setIsDetailsOpen(true);
      },
    },
    {
      label:
        campaign.status === "active"
          ? "Pausar Campaña"
          : "Reanudar Campaña",
      icon:
        campaign.status === "active" ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        ),
      action: () => {
        const action =
          campaign.status === "active"
            ? "pausada"
            : "reanudada";
        toast.success(`Campaña ${action}: ${campaign.name}`);
      },
      separator: true,
    },
    {
      label: "Editar Campaña",
      icon: <Edit className="w-4 h-4" />,
      action: () => {
        toast.info(`Editando: ${campaign.name}`);
      },
    },
    {
      label: "Duplicar Campaña",
      icon: <Copy className="w-4 h-4" />,
      action: () => {
        toast.success(
          `Campaña duplicada: ${campaign.name} (copia)`,
        );
      },
    },
    {
      label: "Configuración",
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        toast.info(`Configurando: ${campaign.name}`);
      },
      separator: true,
    },
    {
      label: "Ver Reportes",
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => {
        toast.info(`Abriendo reportes de: ${campaign.name}`);
      },
    },
    {
      label: "Exportar Datos",
      icon: <Download className="w-4 h-4" />,
      action: () => {
        toast.success(`Exportando datos de: ${campaign.name}`);
      },
    },
    {
      label: "Importar Leads",
      icon: <Upload className="w-4 h-4" />,
      action: () => {
        toast.info(`Importando leads a: ${campaign.name}`);
      },
      separator: true,
    },
    {
      label: "Archivar",
      icon: <Archive className="w-4 h-4" />,
      action: () => {
        toast.success(`Campaña archivada: ${campaign.name}`);
      },
    },
    {
      label: "Eliminar",
      icon: <Trash2 className="w-4 h-4" />,
      action: () => {
        toast.error(`Campaña eliminada: ${campaign.name}`);
      },
      variant: "danger" as const,
    },
  ];

  return (
    <>
      <Card
        className="hover:shadow-lg transition-shadow duration-300 ease-out cursor-pointer"
        onClick={() => setIsDetailsOpen(true)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="mb-2">
                {campaign.name}
              </CardTitle>
            </div>
            <Badge
              className={`${getStatusColor(campaign.status)} text-white`}
            >
              {getStatusText(campaign.status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-600 flex items-center gap-2">
                Progreso de contacto
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                ) : (
                  <span>({progressPercentage.toFixed(2)}%)</span>
                )}
              </span>
              <span className={`text-slate-900 ${isLoading ? 'text-slate-400' : ''}`}>
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Cargando...
                  </span>
                ) : (
                  <>
                    {campaign.contactedLeads.toLocaleString()} /{" "}
                    {campaign.totalLeads.toLocaleString()} leads
                  </>
                )}
              </span>
            </div>
            <Progress
              value={isLoading ? 0 : progressPercentage}
              className={`h-2 ${isLoading ? 'animate-pulse' : ''}`}
            />
          </div>
        </CardContent>
      </Card>

      <CampaignDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        campaign={campaign}
      />
    </>
  );
}