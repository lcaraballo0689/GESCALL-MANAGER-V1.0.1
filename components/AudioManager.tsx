import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import {
    Music,
    Upload,
    Trash2,
    Play,
    Pause,
    Search,
    RefreshCw,
    FileAudio,
    AlertCircle,
    CheckCircle2,
    Loader2,
    X,
    Volume2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AudioFile {
    filename: string;
    path: string;
    size: number;
    modified: string | null;
    type: string;
}

export function AudioManager() {
    const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCampaign, setSelectedCampaign] = useState<string>("");
    const [playingFile, setPlayingFile] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const campaigns = useAuthStore(state => state.getCampaigns());
    const userLevel = useAuthStore(state => state.getUserLevel());

    // 1. Filter files based on user permissions (Allowed Campaigns)
    const accessibleFiles = useMemo(() => {
        // Admins (Level >= 9) see all files
        if (userLevel >= 9) return audioFiles;

        if (campaigns.length === 0) return []; // If no campaigns, no access

        const allowedFilenames = new Set(
            campaigns.map(c => `gc_${c.id.toLowerCase().replace(/[^a-z0-9]/g, '')}.wav`)
        );
        return audioFiles.filter(f => allowedFilenames.has(f.filename));
    }, [audioFiles, campaigns]);

    // 2. Filter files based on search term
    const filteredFiles = useMemo(() => {
        if (!searchTerm) return accessibleFiles;
        const lowerTerm = searchTerm.toLowerCase();
        return accessibleFiles.filter(f => f.filename.toLowerCase().includes(lowerTerm));
    }, [accessibleFiles, searchTerm]);
    // Fetch audio files
    const fetchAudioFiles = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.getAudioFiles();

            if (response.success) {
                setAudioFiles(response.data || []);
            } else {
                toast.error("Error al cargar audios: " + response.error);
            }
        } catch (error: any) {
            console.error("[AudioManager] Fetch error:", error);
            toast.error("Error al conectar con el servidor");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAudioFiles();
    }, [fetchAudioFiles]);

    // Handle file upload
    const handleUpload = async (file: File) => {
        if (!file) return;

        // Validate file type
        const validTypes = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg'];
        if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.wav')) {
            toast.error("Solo se permiten archivos WAV o MP3");
            return;
        }

        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            toast.error("El archivo es demasiado grande (máximo 50MB)");
            return;
        }

        // Validate campaign selection
        if (!selectedCampaign) {
            toast.error("Debes seleccionar una campaña");
            return;
        }

        setUploading(true);

        try {
            const response = await api.uploadAudio(file, selectedCampaign);

            if (response.success) {
                toast.success(`Audio "${response.data.filename}" subido exitosamente`);
                fetchAudioFiles();
            } else {
                toast.error("Error al subir: " + response.error);
            }
        } catch (error: any) {
            console.error("[AudioManager] Upload error:", error);
            toast.error(error.message || "Error al subir el archivo");
        } finally {
            setUploading(false);
        }
    };

    // Handle delete
    const handleDelete = async (filename: string) => {
        if (!confirm(`¿Estás seguro de eliminar "${filename}"?`)) {
            return;
        }

        try {
            const response = await api.deleteAudio(filename);

            if (response.success) {
                toast.success("Audio eliminado");
                setAudioFiles((prev) => prev.filter((f) => f.filename !== filename));
                if (playingFile === filename) {
                    stopPlayback();
                }
            } else {
                toast.error("Error al eliminar: " + response.error);
            }
        } catch (error: any) {
            console.error("[AudioManager] Delete error:", error);
            toast.error("Error al eliminar el archivo");
        }
    };

    // Playback controls
    const playAudio = (filename: string) => {
        if (playingFile === filename) {
            audioRef.current?.pause();
            setPlayingFile(null);
            return;
        }

        const streamUrl = api.getAudioStreamUrl(filename);

        if (audioRef.current) {
            audioRef.current.src = streamUrl;
            audioRef.current.play().catch(e => {
                console.error("Playback error:", e);
                toast.error("No se pudo reproducir el audio. Verifica el formato.");
                setPlayingFile(null);
            });
            setPlayingFile(filename);
        }
    };

    const stopPlayback = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setPlayingFile(null);
    };

    // Drag and drop handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
            // Reset input to allow selecting the same file again
            e.target.value = '';
        }
    };

    // Format file size
    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    // Format date
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };



    return (
        <div className="space-y-6 p-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Gestión de Audios
                    </h1>
                </div>
                <Button onClick={fetchAudioFiles} variant="outline" disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Actualizar
                </Button>
            </div>

            {/* Upload Zone */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Subir Audio para Campaña</CardTitle>
                    <CardDescription>
                        Selecciona la campaña y sube el archivo.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="campaign-select">Campaña</Label>
                        <Select
                            value={selectedCampaign}
                            onValueChange={setSelectedCampaign}
                        >
                            <SelectTrigger id="campaign-select" className="w-[300px]">
                                <SelectValue placeholder="Seleccionar campaña..." />
                            </SelectTrigger>
                            <SelectContent>
                                {campaigns.map((campaign) => (
                                    <SelectItem key={campaign.id} value={campaign.id}>
                                        {campaign.id === campaign.name ? campaign.id : `${campaign.id} - ${campaign.name}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">
                            {selectedCampaign && `El archivo se guardará como: gc_${selectedCampaign.toLowerCase().replace(/[^a-z0-9]/g, '')}.wav`}
                        </p>
                    </div>

                    <div
                        className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive
                                ? "border-purple-500 bg-purple-50"
                                : "border-slate-300 hover:border-purple-400 hover:bg-slate-50"
                            }
              ${uploading ? "pointer-events-none opacity-50" : "cursor-pointer"}
            `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => !uploading && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".wav,.mp3,audio/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {uploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                                <p className="text-slate-600">Subiendo audio...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="w-10 h-10 text-slate-400" />
                                <p className="text-slate-600">
                                    Arrastra un archivo aquí o <span className="text-purple-600 font-medium">haz clic para seleccionar</span>
                                </p>
                                <p className="text-xs text-slate-400">
                                    Máximo 50MB • en formato MP3 o WAV
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Audio List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Archivos de Audio</CardTitle>
                            <CardDescription>
                                {accessibleFiles.length} archivos disponibles
                            </CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar audio..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                            <span className="ml-3 text-slate-500">Cargando audios...</span>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <FileAudio className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No hay archivos de audio{searchTerm && " que coincidan con la búsqueda"}</p>
                        </div>
                    ) : (
                        <div className="max-h-[500px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white">
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Tamaño</TableHead>
                                        <TableHead>Modificado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFiles.map((file) => (
                                        <TableRow key={file.filename}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Volume2 className="w-4 h-4 text-purple-500" />
                                                    <span className="truncate max-w-[200px]" title={file.filename}>
                                                        {file.filename}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="uppercase">
                                                    {file.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{formatSize(file.size)}</TableCell>
                                            <TableCell className="text-slate-500 text-sm">
                                                {formatDate(file.modified)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            playingFile === file.filename
                                                                ? stopPlayback()
                                                                : playAudio(file.filename)
                                                        }
                                                        className="text-blue-600 hover:text-blue-700"
                                                    >
                                                        {playingFile === file.filename ? (
                                                            <Pause className="w-4 h-4" />
                                                        ) : (
                                                            <Play className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(file.filename)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Hidden audio element for playback */}
            <audio ref={audioRef} onEnded={() => setPlayingFile(null)} />
        </div >
    );
}
