import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import api from "@/services/api";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Phone,
  TrendingUp,
  Clock,
  BarChart3,
  Upload,
  List,
  CheckCircle2,
  Download,
  Search,
  Filter,
  PhoneOff,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";
import { UploadWizardContent } from "./UploadWizardContent";
import { toast } from "sonner";
import { DateRangePicker } from 'react-date-range';
import { es } from 'date-fns/locale';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

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

interface CampaignDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
}

interface DialLogRecord {
  call_date: string;
  phone_number: string;
  status: string;
  list_id: number;
  list_name: string;
  list_description: string;
  campaign_id: string;
}

// Helper function to format date for API (YYYY-MM-DD HH:MM:SS)
const formatDateForAPI = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to get today's date range
const getTodayDateRange = () => {
  const today = new Date();
  const startDatetime = `${formatDateForAPI(today)} 00:00:00`;
  const endDatetime = `${formatDateForAPI(today)} 23:59:59`;
  return { startDatetime, endDatetime };
};

export function CampaignDetailsModal({
  isOpen,
  onClose,
  campaign,
}: CampaignDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("reports");

  // Date filter state - default to today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState([
    {
      startDate: today,
      endDate: today,
      key: 'selection'
    }
  ]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Dial log data state
  const [dialLogData, setDialLogData] = useState<DialLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);

  // Report filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listFilter, setListFilter] = useState("all");

  // Infinite scroll state
  const [displayedRecords, setDisplayedRecords] = useState(100);
  const recordsPerPage = 100;

  // Upload wizard state for Lists tab
  const [showUploadWizard, setShowUploadWizard] =
    useState(false);

  // Helper function to get all dates between start and end
  const getDatesBetween = (start: Date, end: Date): Date[] => {
    const dates: Date[] = [];
    const currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0);

    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  // Function to fetch dial log data (triggered by button click)
  const fetchDialLog = async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = dateRange[0].startDate;
      const endDate = dateRange[0].endDate;

      // Get all dates in the range
      const dates = getDatesBetween(startDate, endDate);
      const totalDays = dates.length;

      console.log(`[CampaignDetailsModal] Fetching dial log for ${campaign.id}`);
      console.log(`[CampaignDetailsModal] Date range: ${formatDateForAPI(startDate)} - ${formatDateForAPI(endDate)}`);
      console.log(`[CampaignDetailsModal] Total days: ${totalDays}`);

      if (totalDays === 1) {
        // Single day query
        const startDatetime = `${formatDateForAPI(startDate)} 00:00:00`;
        const endDatetime = `${formatDateForAPI(endDate)} 23:59:59`;

        const response = await api.getCampaignDialLog(
          campaign.id,
          startDatetime,
          endDatetime
        );

        if (response.success && response.data) {
          console.log(`[CampaignDetailsModal] Received ${response.data.length} records`);
          setDialLogData(response.data);
        } else {
          console.warn("[CampaignDetailsModal] No data received");
          setDialLogData([]);
        }
      } else {
        // Multiple days - query each day separately with progress tracking
        console.log(`[CampaignDetailsModal] Splitting into ${totalDays} day queries`);
        setLoadingProgress({ current: 0, total: totalDays });

        const allResults: DialLogRecord[] = [];

        // Process days sequentially to avoid overwhelming the server
        for (let i = 0; i < dates.length; i++) {
          const date = dates[i];
          const dayStart = `${formatDateForAPI(date)} 00:00:00`;
          const dayEnd = `${formatDateForAPI(date)} 23:59:59`;

          console.log(`[CampaignDetailsModal] Fetching day: ${formatDateForAPI(date)}`);

          try {
            const response = await api.getCampaignDialLog(
              campaign.id,
              dayStart,
              dayEnd
            );

            if (response.success && response.data) {
              console.log(`[CampaignDetailsModal] Day ${formatDateForAPI(date)}: ${response.data.length} records`);

              // Append results efficiently without causing stack overflow
              allResults.push(...response.data);

              // Update progress and data incrementally
              setLoadingProgress({ current: i + 1, total: totalDays });
              setDialLogData([...allResults]); // Show incremental results
            }
          } catch (err) {
            console.error(`[CampaignDetailsModal] Error fetching day ${formatDateForAPI(date)}:`, err);
          }
        }

        console.log(`[CampaignDetailsModal] Combined total: ${allResults.length} records`);

        // Clear progress indicator
        setLoadingProgress(null);
      }
    } catch (err) {
      console.error("[CampaignDetailsModal] Error fetching dial log:", err);
      setError(err instanceof Error ? err.message : "Error al cargar datos");
      toast.error("Error al cargar el reporte de llamadas");
    } finally {
      setLoading(false);
    }
  };

  // Function to export directly to CSV (without fetching to display)
  const handleExportDirect = async () => {
    await fetchDialLog();
    // After data is fetched, trigger download
    if (dialLogData.length > 0) {
      handleDownloadReport();
    }
  };

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

  // Mock data para listas
  const mockLists = [
    {
      id: 1,
      name: "Lista Principal",
      leads: 5000,
      active: true,
    },
    {
      id: 2,
      name: "Leads Prioritarios",
      leads: 1200,
      active: true,
    },
    { id: 3, name: "Recontactos", leads: 800, active: false },
  ];

  // Filter dial log records for reports
  const filteredRecords = dialLogData.filter((record) => {
    const matchesSearch =
      record.phone_number.includes(searchTerm) ||
      (record.list_name && record.list_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" || record.status === statusFilter;
    const matchesList =
      listFilter === "all" || record.list_name === listFilter;

    return matchesSearch && matchesStatus && matchesList;
  });

  // Infinite scroll calculations
  const visibleRecords = filteredRecords.slice(0, displayedRecords);
  const hasMore = displayedRecords < filteredRecords.length;

  // Reset displayed records when filters change
  useEffect(() => {
    setDisplayedRecords(100);
  }, [searchTerm, statusFilter, listFilter]);

  // Handle scroll event for infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    // Load more when scrolled to bottom (with 100px threshold)
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
      setDisplayedRecords(prev => prev + recordsPerPage);
    }
  };

  // Get unique statuses and lists for filters
  const uniqueStatuses = Array.from(new Set(dialLogData.map(r => r.status))).sort();
  const uniqueLists = Array.from(new Set(dialLogData.map(r => r.list_name))).filter(Boolean).sort();

  // Vicidial status color mapping
  const getDialStatusColor = (status: string) => {
    // Success statuses
    if (["SALE", "PU", "PM"].includes(status)) return "bg-green-500";
    // Callback/scheduled
    if (["CB", "CALLBK"].includes(status)) return "bg-blue-500";
    // No answer
    if (["NA", "AA", "N"].includes(status)) return "bg-yellow-500";
    // Busy/Drop
    if (["B", "DROP", "XDROP"].includes(status)) return "bg-orange-500";
    // DNC/Failed
    if (["DNC", "DC", "ADC"].includes(status)) return "bg-red-500";
    // New/Pending
    if (["NEW", "NI"].includes(status)) return "bg-slate-400";
    // Default
    return "bg-purple-500";
  };

  const handleDownloadReport = () => {
    const headers = [
      "Fecha/Hora",
      "Teléfono",
      "Estado",
      "ID Lista",
      "Nombre Lista",
      "Descripción Lista",
      "Campaign ID",
    ];

    const rows = filteredRecords.map((record) => [
      record.call_date,
      record.phone_number,
      record.status,
      record.list_id.toString(),
      record.list_name || "",
      record.list_description || "",
      record.campaign_id,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const startDate = dateRange[0].startDate;
    const endDate = dateRange[0].endDate;
    a.download = `reporte_dial_log_${campaign.name.replace(/\s+/g, "_")}_${formatDateForAPI(startDate)}_${formatDateForAPI(endDate)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success(
      `Reporte descargado: ${filteredRecords.length} registros`,
    );
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setListFilter("all");
  };

  const handleUploadCancel = () => {
    setShowUploadWizard(false);
  };

  const handleUploadSuccess = () => {
    setShowUploadWizard(false);
    // TODO: Refetch lists from API
    toast.success(
      "Lista cargada exitosamente. Actualizando...",
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[96vw] w-[96vw] max-h-[96vh] h-[96vh] p-0">
        {/* Header fijo */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl">
                {campaign.name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-2">
                <Phone className="w-4 h-4" />
                {campaign.dialingMethod}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* Tabs con scroll */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1"
        >
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="reports" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Reportes
              </TabsTrigger>
              <TabsTrigger value="lists" className="gap-2">
                <List className="w-4 h-4" />
                Listas
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Contenido con scroll */}
          <ScrollArea className="h-[calc(96vh-200px)]">
            <div className="px-6 pb-6">
              {/* Tab: Reportes */}
              <TabsContent
                value="reports"
                className="mt-4 space-y-4"
              >
                {/* Filters */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Date range picker */}
                      <div className="flex items-end gap-3">
                        <div className="relative">
                          <Label className="mb-1.5 block">
                            Rango de Fechas
                          </Label>
                          <Button
                            variant="outline"
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className="w-72 justify-start text-left font-normal"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {formatDateForAPI(dateRange[0].startDate)} - {formatDateForAPI(dateRange[0].endDate)}
                          </Button>
                          {showDatePicker && (
                            <div className="absolute z-50 mt-2 bg-white border rounded-lg shadow-lg">
                              <DateRangePicker
                                ranges={dateRange}
                                onChange={(item: any) => setDateRange([item.selection])}
                                locale={es}
                                dateDisplayFormat="yyyy-MM-dd"
                              />
                              <div className="p-2 border-t flex justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => setShowDatePicker(false)}
                                >
                                  Cerrar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={fetchDialLog}
                          disabled={loading}
                          className="gap-2"
                        >
                          <Search className="w-4 h-4" />
                          Consultar
                        </Button>

                        <Button
                          onClick={handleExportDirect}
                          disabled={loading}
                          variant="outline"
                          className="gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Exportar
                        </Button>

                        <div className="flex-1" />

                        {loading && (
                          <div className="text-slate-600 text-sm">
                            {loadingProgress ? (
                              <>
                                Cargando día {loadingProgress.current} de {loadingProgress.total}... ({dialLogData.length.toLocaleString()} registros)
                              </>
                            ) : (
                              "Cargando datos..."
                            )}
                          </div>
                        )}
                      </div>

                      {/* Search and filters */}
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <Label htmlFor="search" className="mb-1.5 block">
                            Buscar
                          </Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              id="search"
                              placeholder="Teléfono o lista..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>

                        <div className="w-48">
                          <Label htmlFor="statusFilter" className="mb-1.5 block">
                            Estado
                          </Label>
                          <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              {uniqueStatuses.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-48">
                          <Label htmlFor="listFilter" className="mb-1.5 block">
                            Lista
                          </Label>
                          <Select
                            value={listFilter}
                            onValueChange={setListFilter}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              {uniqueLists.map((listName) => (
                                <SelectItem key={listName} value={listName}>
                                  {listName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          variant="outline"
                          onClick={handleClearFilters}
                          className="gap-2"
                        >
                          <Filter className="w-4 h-4" />
                          Limpiar
                        </Button>

                        <Button
                          onClick={handleDownloadReport}
                          className="gap-2"
                          disabled={loading || filteredRecords.length === 0}
                        >
                          <Download className="w-4 h-4" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Table */}
                <Card>
                  <CardContent className="p-0">
                    <div
                      className="max-h-[500px] overflow-auto relative"
                      onScroll={handleScroll}
                    >
                      <Table>
                        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                          <TableRow>
                            <TableHead className="bg-white">Fecha/Hora</TableHead>
                            <TableHead className="bg-white">Teléfono</TableHead>
                            <TableHead className="bg-white">Estado</TableHead>
                            <TableHead className="bg-white">Lista</TableHead>
                            <TableHead className="bg-white">Descripción Lista</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading && dialLogData.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center py-8 text-slate-500"
                              >
                                Cargando datos...
                              </TableCell>
                            </TableRow>
                          ) : error ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center py-8 text-red-500"
                              >
                                Error: {error}
                              </TableCell>
                            </TableRow>
                          ) : filteredRecords.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center py-8 text-slate-500"
                              >
                                {dialLogData.length === 0
                                  ? "No hay registros para este rango de fechas"
                                  : "No se encontraron registros con los filtros aplicados"}
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {visibleRecords.map((record, idx) => (
                                <TableRow key={`${record.call_date}-${record.phone_number}-${idx}`}>
                                  <TableCell className="font-mono text-sm">
                                    {record.call_date}
                                  </TableCell>
                                  <TableCell className="font-mono">
                                    {record.phone_number}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      className={`${getDialStatusColor(record.status)} text-white`}
                                    >
                                      {record.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {record.list_name || "-"}
                                  </TableCell>
                                  <TableCell className="text-slate-600">
                                    {record.list_description || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {hasMore && (
                                <TableRow>
                                  <TableCell
                                    colSpan={5}
                                    className="text-center py-4 text-slate-500 text-sm"
                                  >
                                    Desplázate hacia abajo para cargar más registros...
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Footer Info */}
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">
                    Mostrando {Math.min(displayedRecords, filteredRecords.length).toLocaleString()} de{" "}
                    {filteredRecords.length.toLocaleString()} registros filtrados
                    {filteredRecords.length !== dialLogData.length && (
                      <span className="text-slate-500"> ({dialLogData.length.toLocaleString()} total)</span>
                    )}
                  </p>
                  {dialLogData.length > 0 && (
                    <p className="text-slate-500 text-sm">
                      Rango: {formatDateForAPI(dateRange[0].startDate)} - {formatDateForAPI(dateRange[0].endDate)}
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Tab: Listas */}
              <TabsContent value="lists" className="mt-4">
                {showUploadWizard ? (
                  <Card>
                    <CardContent className="p-6">
                      <UploadWizardContent
                        campaignName={campaign.name}
                        onCancel={handleUploadCancel}
                        onSuccess={handleUploadSuccess}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Listas de Leads</CardTitle>
                          <CardDescription>
                            Administra las listas asociadas a
                            esta campaña
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() =>
                              setShowUploadWizard(true)
                            }
                          >
                            <Upload className="w-4 h-4" />
                            Cargar Leads
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {mockLists.map((list) => (
                          <div
                            key={list.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-purple-100 rounded-lg">
                                <List className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <h4 className="text-slate-900">
                                  {list.name}
                                </h4>
                                <p className="text-slate-500">
                                  {list.leads.toLocaleString()}{" "}
                                  leads
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={
                                  list.active
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {list.active
                                  ? "Activa"
                                  : "Inactiva"}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                              >
                                Ver Detalles
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}