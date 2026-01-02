import { useState, useCallback, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import {
  CheckCircle2,
  Upload,
  FileDown,
  ArrowRight,
  ArrowLeft,
  FileText,
  X,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "./ui/utils";
import api from "@/services/api";
import socket from "@/services/socket";
import { useBackgroundTasks } from "@/stores/useBackgroundTasks";

interface UploadWizardContentProps {
  campaignName: string;
  campaignId: string;
  onComplete?: () => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3 | 4;
type ListOption = "new";

export function UploadWizardContent({
  campaignName,
  campaignId,
  onComplete,
  onCancel,
  onSuccess,
}: UploadWizardContentProps) {
  const [currentStep, setCurrentStep] = useState<Step>(2);
  const [listOption, setListOption] =
    useState<ListOption>("new");
  const [isStartingUpload, setIsStartingUpload] = useState(false);

  // Background tasks store
  const { addTask, updateTaskProgress, completeTask, failTask } = useBackgroundTasks();

  const [newListData, setNewListData] = useState({
    listId: "",
    name: "",
    campaign: campaignId,
    description: "",
  });

  const [fileData, setFileData] = useState<{
    file: File | null;
    isDragging: boolean;
  }>({
    file: null,
    isDragging: false,
  });

  const [loadingListId, setLoadingListId] = useState(true);

  // Auto-fetch next list ID when component mounts
  useEffect(() => {
    const fetchNextListId = async () => {
      try {
        const response = await api.getNextListId();
        if (response.success && response.next_id) {
          setNewListData(prev => ({
            ...prev,
            listId: response.next_id.toString(),
          }));
        }
      } catch (error) {
        console.error("[UploadWizard] Error fetching next list ID:", error);
        toast.error("Error al obtener el ID de lista");
      } finally {
        setLoadingListId(false);
      }
    };

    fetchNextListId();
  }, []);

  const handleNext = () => {
    // Since listOption is always "new", we skip the initial validation for listOption presence.
    // Also, step 1 is now effectively skipped by initial state, so we check for currentStep === 2
    if (currentStep === 2) {
      if (!newListData.listId || !newListData.name) {
        toast.error("Completa los campos obligatorios");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 2) { // Changed from 1 to 2, as step 1 is now effectively skipped
      setCurrentStep((currentStep - 1) as Step);
    } else if (currentStep === 2) {
      if (onCancel) onCancel(); // If on the first actual step, treat "back" as cancel
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "phone_number",
      "phone_code",
      "vendor_lead_code",
      "comments",
    ];

    const csvContent = headers.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_leads.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Template descargado exitosamente");
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Selecciona un archivo CSV válido");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo no debe exceder 10MB");
      return;
    }

    setFileData({ ...fileData, file });
    toast.success(`Archivo "${file.name}" cargado`);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setFileData((prev) => ({ ...prev, isDragging: false }));

    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setFileData((prev) => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setFileData((prev) => ({ ...prev, isDragging: false }));
  }, []);

  const parseCSV = (text: string): any[] => {
    // Handle both Windows (CRLF) and Unix (LF) line endings
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      // Allow rows with fewer columns (use empty string for missing values)
      if (values.length > 0) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        data.push(row);
      }
    }

    return data;
  };

  const handleFinish = async () => {
    if (!fileData.file) {
      toast.error("Selecciona un archivo CSV");
      return;
    }

    setIsStartingUpload(true);

    try {
      // Step 1: Create list (always "new" now)
      toast.info("Creando nueva lista...");

      const createResult = await api.createList({
        list_id: newListData.listId,
        list_name: newListData.name,
        campaign_id: campaignId,
        list_description: newListData.description,
        active: 'Y',
      });

      if (!createResult.success) {
        throw new Error("Error al crear la lista: " + (createResult.error || 'Error desconocido'));
      }

      const targetListId = newListData.listId;
      toast.success("Lista creada exitosamente");

      // Step 2: Read and parse CSV
      const text = await fileData.file.text();
      const leads = parseCSV(text);

      if (leads.length === 0) {
        throw new Error("El archivo CSV está vacío o tiene un formato inválido");
      }

      // Normalize keys to match backend expected format (snake_case)
      // and map potential column names to required fields
      const normalizedLeads = leads.map(lead => {
        const keys = Object.keys(lead);
        const normalized: any = { ...lead };

        // Helper to find key case-insensitive
        const findKey = (candidates: string[]) =>
          keys.find(k => candidates.includes(k.toLowerCase().trim()));

        // Map Phone Number (Critical)
        const phoneKey = findKey(['phone', 'phone_number', 'telefono', 'teléfono', 'celular', 'movil', 'mobile', 'contacto', 'number']);
        if (phoneKey) {
          normalized.phone_number = lead[phoneKey].replace(/[^0-9]/g, '');
        } else if (keys.length > 0) {
          // Fallback: use first column as phone number if no match found
          normalized.phone_number = lead[keys[0]].replace(/[^0-9]/g, '');
        }

        // Map First Name
        const nameKey = findKey(['first_name', 'firstname', 'name', 'nombre', 'nombres']);
        if (nameKey) {
          normalized.first_name = lead[nameKey];
        }

        // Map Last Name
        const lastNameKey = findKey(['last_name', 'lastname', 'surname', 'apellido', 'apellidos']);
        if (lastNameKey) {
          normalized.last_name = lead[lastNameKey];
        }

        return normalized;
      });

      // Filter out invalid leads (no phone number)
      const validLeads = normalizedLeads.filter(l => l.phone_number && l.phone_number.length >= 7);

      if (validLeads.length === 0) {
        throw new Error("No se encontraron registros con números de teléfono válidos (mínimo 7 dígitos). Revisa las columnas de tu CSV.");
      }

      // Step 3: Create background task
      const taskId = `upload-${Date.now()}`;

      addTask({
        id: taskId,
        type: 'lead_upload',
        title: `Cargando ${leads.length} leads`,
        description: `Lista: ${newListData.name} • Campaña: ${campaignName}`,
        progress: 0,
        status: 'running',
        metadata: {
          campaignId,
          campaignName,
          listId: targetListId,
          listName: newListData.name,
          totalRecords: leads.length,
          processedRecords: 0,
        },
      });

      // Step 4: Connect to Socket.IO
      await socket.connect();

      // Set up socket listeners for background progress
      const handleProgress = (progress: any) => {
        // Filter events for this specific task
        if (progress.processId !== taskId) return;
        updateTaskProgress(taskId, progress.percentage, progress.processed);
      };

      const handleComplete = (result: any) => {
        // Filter events for this specific task
        if (result.processId !== taskId) return;

        // Clean up listeners
        socket.off('upload:leads:progress', handleProgress);
        socket.off('upload:leads:complete', handleComplete);
        socket.off('upload:leads:error', handleError);

        // Complete the task
        completeTask(taskId, {
          successful: result.successful,
          errors: result.errors,
        });

        // Show success toast
        toast.success(`¡Carga completada! ${result.successful} registros exitosos`);

        // Trigger callbacks
        if (onSuccess) onSuccess();
      };

      const handleError = (error: any) => {
        // Filter events for this specific task
        // Note: Error events might need processId updating in backend too if generic
        // For now assuming socket errors are connection related or specific enough

        // Clean up listeners
        socket.off('upload:leads:progress', handleProgress);
        socket.off('upload:leads:complete', handleComplete);
        socket.off('upload:leads:error', handleError);

        // Fail the task
        failTask(taskId, error.message || 'Error desconocido');
        toast.error(`Error en la carga: ${error.message}`);
      };

      socket.on('upload:leads:progress', handleProgress);
      socket.on('upload:leads:complete', handleComplete);
      socket.on('upload:leads:error', handleError);

      // Start upload with processId
      socket.emit('upload:leads:start', {
        leads: validLeads,
        list_id: targetListId,
        campaign_id: campaignId,
        processId: taskId,
      });

      // Close wizard immediately - upload continues in background
      toast.info("Carga iniciada en segundo plano. Puedes seguir trabajando.");
      if (onComplete) onComplete();

    } catch (error) {
      setIsStartingUpload(false);
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Error al procesar el archivo");
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      // Step 1 is effectively skipped, so we adjust titles for remaining steps
      case 2:
        return "Configurar Lista";
      case 3:
        return "Template";
      case 4:
        return "Cargar Archivo";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-slate-900 mb-1">Cargar Leads</h3>
        <p className="text-slate-500 text-sm">
          Paso {currentStep - 1} de 3: {getStepTitle()} {/* Adjust step numbering for display */}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-4 left-0 right-0 h-1 bg-slate-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{
              width: `${((currentStep - 2) / 2) * 100}%`, // Adjust progress calculation
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {[
            // Removed step 1 "Tipo"
            { num: 2, label: "Lista" },
            { num: 3, label: "Template" },
            { num: 4, label: "Archivo" },
          ].map((step) => (
            <div
              key={step.num}
              className="flex flex-col items-center"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10",
                  currentStep >= step.num
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-400",
                )}
              >
                {step.num - 1} {/* Adjust step number display */}
              </div>
              <span
                className={cn(
                  "text-xs mt-2 transition-colors duration-300",
                  currentStep >= step.num
                    ? "text-blue-600"
                    : "text-slate-400",
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[380px]">
        {/* PASO 1: Seleccionar Tipo de Lista (This section is now effectively skipped by initial state) */}
        {/* PASO 2: Configurar Lista */}
        {(currentStep === 2) && (
          <div className="space-y-4">
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="listId"
                    className="mb-2 block"
                  >
                    ID Lista <span className="text-xs text-slate-500">(auto-generado)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="listId"
                      placeholder="Cargando..."
                      type="text"
                      value={newListData.listId}
                      readOnly
                      className="bg-slate-100 cursor-not-allowed"
                    />
                    {loadingListId && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="listName"
                    className="mb-2 block"
                  >
                    Nombre *
                  </Label>
                  <Input
                    id="listName"
                    placeholder="Mi Lista Octubre"
                    value={newListData.name}
                    onChange={(e) =>
                      setNewListData({
                        ...newListData,
                        name: e.target.value,
                      })
                    }
                    className="bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">
                  Campaña
                </Label>
                <Input
                  value={campaignName}
                  disabled
                  className="bg-slate-100"
                />
              </div>

              <div>
                <Label
                  htmlFor="description"
                  className="mb-2 block"
                >
                  Descripción (opcional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Descripción breve..."
                  value={newListData.description}
                  onChange={(e) =>
                    setNewListData({
                      ...newListData,
                      description: e.target.value,
                    })
                  }
                  className="bg-slate-50 resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: Descargar Template */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <FileDown className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-slate-900 mb-2">
                Template CSV
              </h3>
              <p className="text-slate-600 mb-6">
                Descarga la plantilla con el formato correcto
              </p>
              <Button
                onClick={handleDownloadTemplate}
                size="lg"
                className="gap-2"
              >
                <FileDown className="w-5 h-5" />
                Descargar Template
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-blue-900 mb-1">
                    Campos del Template
                  </h4>
                  <p className="text-blue-700 text-sm">
                    El archivo incluye 4 campos: phone_number, phone_code,
                    vendor_lead_code y comments.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Nota:</strong> phone_number es requerido. phone_code (código de país, ej: 57 para Colombia)
                es opcional (por defecto 1). vendor_lead_code y comments son opcionales.
              </p>
            </div>
          </div>
        )}

        {/* PASO 4: Cargar Archivo */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 transition-all",
                fileData.isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 bg-slate-50",
              )}
            >
              <input
                id="fileUpload"
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
              />

              {!fileData.file ? (
                <label
                  htmlFor="fileUpload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="w-12 h-12 text-slate-400 mb-3" />
                  <p className="text-slate-900 mb-2">
                    Arrastra tu archivo aquí
                  </p>
                </label>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-slate-900">
                        {fileData.file.name}
                      </p>
                      <p className="text-slate-500 text-sm">
                        {(fileData.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setFileData({ ...fileData, file: null })
                    }
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {fileData.file && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Archivo listo para procesar</span>
                </div>
              </div>
            )}

            <div className="bg-slate-100 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Lista:</span>{" "}
                  <span className="text-slate-900">
                    {newListData.name} {/* Simplified display */}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">
                    Campaña:
                  </span>{" "}
                  <span className="text-slate-900">
                    {campaignName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        {currentStep === 2 ? (
          <Button
            variant="ghost"
            onClick={onCancel}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Atrás
          </Button>
        )}

        <div className="flex gap-3">
          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              className="gap-2 bg-slate-900 hover:bg-slate-800"
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="gap-2 bg-slate-900 hover:bg-slate-800"
              disabled={!fileData.file || isStartingUpload}
            >
              {isStartingUpload ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando...</>
              ) : (
                <><Upload className="w-4 h-4" /> Cargar Leads</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
