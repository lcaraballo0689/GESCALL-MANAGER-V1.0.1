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

interface UploadWizardContentProps {
  campaignName: string;
  campaignId: string;
  onComplete?: () => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3 | 4;
type ListOption = "existing" | "new" | null;

export function UploadWizardContent({
  campaignName,
  campaignId,
  onComplete,
  onCancel,
  onSuccess,
}: UploadWizardContentProps) {
  // Lists state
  const [campaignLists, setCampaignLists] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [listOption, setListOption] =
    useState<ListOption>(null);
  const [selectedList, setSelectedList] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [recordsProcessed, setRecordsProcessed] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

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

  // Fetch campaign lists on component mount
  useEffect(() => {
    const fetchLists = async () => {
      setLoadingLists(true);
      try {
        const response = await api.getCampaignLists(campaignId);
        if (response.success && response.data) {
          setCampaignLists(response.data);
        }
      } catch (error) {
        console.error("Error loading lists:", error);
        toast.error("Error al cargar las listas");
      } finally {
        setLoadingLists(false);
      }
    };

    fetchLists();
  }, [campaignId]);

  const handleNext = () => {
    if (currentStep === 1) {
      // Validar que se seleccionó una opción
      if (!listOption) {
        toast.error("Selecciona un tipo de lista");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validar configuración de lista
      if (listOption === "existing" && !selectedList) {
        toast.error("Selecciona una lista existente");
        return;
      }
      if (listOption === "new") {
        if (!newListData.listId || !newListData.name) {
          toast.error("Completa los campos obligatorios");
          return;
        }
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "phone_number",
      "phone_code",
      "list_id",
      "vendor_lead_code",
      "source_id",
      "title",
      "first_name",
      "middle_initial",
      "last_name",
      "address1",
      "address2",
      "address3",
      "city",
      "state",
      "province",
      "postal_code",
      "country_code",
      "gender",
      "date_of_birth",
      "alt_phone",
      "email",
      "security_phrase",
      "comments",
      "rank",
      "owner",
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
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length === headers.length) {
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

    setIsUploading(true);
    setUploadProgress(0);
    setRecordsProcessed(0);

    const startTime = Date.now();

    try {
      // Step 1: Create list if needed
      let targetListId = selectedList;

      if (listOption === "new") {
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

        targetListId = newListData.listId;
        toast.success("Lista creada exitosamente");
      }

      // Step 2: Read and parse CSV
      const text = await fileData.file.text();
      const leads = parseCSV(text);

      if (leads.length === 0) {
        throw new Error("El archivo CSV está vacío o tiene un formato inválido");
      }

      setTotalRecords(leads.length);
      toast.info(`Procesando ${leads.length} registros...`);

      // Step 3: Connect to Socket.IO and upload leads
      await socket.connect();

      return new Promise<void>((resolve, reject) => {
        // Listen for progress updates
        socket.on('upload:leads:progress', (progress: any) => {
          setRecordsProcessed(progress.processed);
          setUploadProgress(progress.percentage);
        });

        // Listen for completion
        socket.on('upload:leads:complete', (result: any) => {
          const endTime = Date.now();
          const duration = ((endTime - startTime) / 1000).toFixed(1);

          setIsUploading(false);

          // Clean up socket listeners
          socket.off('upload:leads:progress');
          socket.off('upload:leads:complete');

          // Reset form
          setCurrentStep(1);
          setListOption(null);
          setSelectedList("");
          setNewListData({
            listId: "",
            name: "",
            campaign: campaignId,
            description: "",
          });
          setFileData({ file: null, isDragging: false });
          setUploadProgress(0);
          setRecordsProcessed(0);
          setTotalRecords(0);

          toast.success(
            <div>
              <div className="mb-1">¡Carga completada exitosamente!</div>
              <div className="text-slate-600">
                <div>• {result.successful} registros exitosos</div>
                {result.errors > 0 && (
                  <div>• {result.errors} errores encontrados</div>
                )}
                <div>• Tiempo: {duration}s</div>
              </div>
            </div>,
            { duration: 5000 },
          );

          if (onComplete) onComplete();
          if (onSuccess) onSuccess();

          resolve();
        });

        // Start upload
        socket.emit('upload:leads:start', {
          leads,
          list_id: targetListId,
          campaign_id: campaignId,
        });
      });
    } catch (error) {
      setIsUploading(false);
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Error al procesar el archivo");
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Tipo de Lista";
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
          Paso {currentStep} de 4: {getStepTitle()}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-4 left-0 right-0 h-1 bg-slate-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{
              width: `${((currentStep - 1) / 3) * 100}%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {[
            { num: 1, label: "Tipo" },
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
                {step.num}
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
        {/* PASO 1: Seleccionar Tipo de Lista */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Options en grid horizontal */}
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={cn(
                  "cursor-pointer transition-all border-2",
                  listOption === "existing"
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300",
                )}
                onClick={() => {
                  setListOption("existing");
                  // Auto avanzar al siguiente paso
                  setTimeout(() => setCurrentStep(2), 300);
                }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                        listOption === "existing"
                          ? "border-blue-600"
                          : "border-slate-300",
                      )}
                    >
                      {listOption === "existing" && (
                        <div className="w-3 h-3 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-slate-900 mb-1">
                        Lista Existente
                      </h4>
                      <p className="text-slate-500 text-sm">
                        Agregar leads a una lista del sistema
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "cursor-pointer transition-all border-2",
                  listOption === "new"
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300",
                )}
                onClick={() => {
                  setListOption("new");
                  // Auto avanzar al siguiente paso
                  setTimeout(() => setCurrentStep(2), 300);
                }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                        listOption === "new"
                          ? "border-blue-600"
                          : "border-slate-300",
                      )}
                    >
                      {listOption === "new" && (
                        <div className="w-3 h-3 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-slate-900 mb-1">
                        Nueva Lista
                      </h4>
                      <p className="text-slate-500 text-sm">
                        Crear una nueva lista
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* PASO 2: Configurar Lista */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {listOption === "existing" ? (
              <div className="pt-2">
                <Label
                  htmlFor="existingList"
                  className="mb-2 block"
                >
                  Seleccionar Lista *
                </Label>
                {loadingLists ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    <span className="ml-2 text-slate-500">Cargando listas...</span>
                  </div>
                ) : campaignLists.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No hay listas disponibles para esta campaña
                  </div>
                ) : (
                  <Select
                    value={selectedList}
                    onValueChange={setSelectedList}
                  >
                    <SelectTrigger className="bg-slate-50">
                      <SelectValue placeholder="Elige una lista" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignLists.map((list) => (
                        <SelectItem key={list.list_id} value={list.list_id.toString()}>
                          {list.list_name} (ID: {list.list_id}) - {list.total_leads || 0} leads
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="listId"
                      className="mb-2 block"
                    >
                      ID Lista *
                    </Label>
                    <Input
                      id="listId"
                      placeholder="1000100"
                      type="number"
                      value={newListData.listId}
                      onChange={(e) =>
                        setNewListData({
                          ...newListData,
                          listId: e.target.value,
                        })
                      }
                      className="bg-slate-50"
                    />
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
            )}
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
                    El archivo incluye 25 campos estándar de
                    Vicidial: phone_number, phone_code,
                    first_name, last_name, email, address, y
                    más.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Nota:</strong> Completa los campos
                phone_number y list_id como mínimo. Los demás
                campos son opcionales.
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
                        {(fileData.file.size / 1024).toFixed(1)}{" "}
                        KB
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
                    {listOption === "existing"
                      ? campaignLists.find(
                          (l) => l.list_id.toString() === selectedList,
                        )?.list_name
                      : newListData.name}
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
        {currentStep === 1 ? (
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
              disabled={!fileData.file}
            >
              <Upload className="w-4 h-4" />
              Cargar Leads
            </Button>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                  <h3 className="text-slate-900 mb-2">
                    Procesando Leads
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Por favor espera mientras procesamos tu
                    archivo
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                  <Progress
                    value={uploadProgress}
                    className="h-3"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {recordsProcessed} de {totalRecords}{" "}
                      registros
                    </span>
                    <span className="text-slate-900">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="mb-1">Validando datos...</p>
                      <ul className="space-y-1 text-blue-700">
                        <li>
                          ✓ Verificando formato de teléfonos
                        </li>
                        <li>✓ Validando campos obligatorios</li>
                        <li>✓ Eliminando duplicados</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}