import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Plus, Trash2, ArrowLeft, ArrowRight, ShieldBan, RefreshCw, Trash } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import apiService from "../services/api";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "./ui/alert-dialog";

export function BlacklistManager() {
    const [numbers, setNumbers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 1
    });

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newNumber, setNewNumber] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [numberToDelete, setNumberToDelete] = useState<string | null>(null);

    // Clear all dialog state
    const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

    const fetchNumbers = async (page = 1, search = "") => {
        setLoading(true);
        try {
            const response = await apiService.getDncList(pagination.limit, page, search);
            if (response.success) {
                setNumbers(response.data);
                setPagination(response.pagination);
            } else {
                toast.error("Error al cargar la lista negra");
            }
        } catch (error) {
            console.error("Error fetching DNC list:", error);
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchNumbers(1, searchTerm);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            fetchNumbers(newPage, searchTerm);
        }
    };

    const handleAddNumber = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNumber.trim()) return;

        setIsSubmitting(true);
        try {
            const response = await apiService.addDncNumber(newNumber);
            if (response.success) {
                toast.success("Número añadido exitosamente");
                setIsAddModalOpen(false);
                setNewNumber("");
                fetchNumbers(1, searchTerm);
            } else {
                toast.error(response.error || "Error al añadir número");
            }
        } catch (error) {
            console.error("Error adding number:", error);
            toast.error("Error al añadir número");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadTemplate = () => {
        const csvContent = "Numero Telefonico\n573001234567\n573109876543\n5551234567";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_lista_negra.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            toast.info("Subiendo archivo...");
            const response = await apiService.uploadDncFile(file);

            if (response.success) {
                toast.success(`Procesado: ${response.data.inserted} números añadidos.`);
                if (response.data.skipped > 0) {
                    toast.info(`${response.data.skipped} duplicados omitidos.`);
                }
                fetchNumbers(1, searchTerm);
            } else {
                toast.error(response.error || "Error al procesar archivo");
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error(error.message || "Error al subir archivo");
        } finally {
            // Clear input
            e.target.value = '';
        }
    };

    const confirmDelete = (phoneNumber: string) => {
        setNumberToDelete(phoneNumber);
        setDeleteDialogOpen(true);
    };

    const handleDeleteNumber = async () => {
        if (!numberToDelete) return;

        try {
            const response = await apiService.removeDncNumber(numberToDelete);
            if (response.success) {
                toast.success("Número eliminado de la lista negra");
                fetchNumbers(pagination.page, searchTerm);
            } else {
                toast.error(response.error || "Error al eliminar número");
            }
        } catch (error) {
            console.error("Error deleting number:", error);
            toast.error("Error al eliminar número");
        } finally {
            setDeleteDialogOpen(false);
            setNumberToDelete(null);
        }
    };

    const handleClearAll = async () => {
        try {
            const response = await apiService.clearAllDncNumbers();
            if (response.success) {
                toast.success(`Se eliminaron ${response.deleted} números`);
                fetchNumbers(1, searchTerm);
            } else {
                toast.error(response.error || "Error al limpiar lista");
            }
        } catch (error) {
            console.error("Error clearing all:", error);
            toast.error("Error al limpiar lista negra");
        } finally {
            setClearAllDialogOpen(false);
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex-shrink-0 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">BLACKLIST</h1>
                    </div>
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex-shrink-0 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="relative flex-1 sm:max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar número..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="text-slate-500 hover:text-slate-700">
                            <span className="underline decoration-dotted underline-offset-4">Descargar Plantilla</span>
                        </Button>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".csv,.txt"
                                className="hidden"
                                id="csv-upload"
                                onChange={handleFileUpload}
                            />
                            <label htmlFor="csv-upload">
                                <Button variant="outline" className="cursor-pointer" asChild>
                                    <span>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Importar CSV
                                    </span>
                                </Button>
                            </label>
                        </div>
                        <Button onClick={() => setIsAddModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Añadir Número
                        </Button>
                        <Button variant="destructive" onClick={() => setClearAllDialogOpen(true)} disabled={pagination.total === 0}>
                            <Trash className="w-4 h-4 mr-2" />
                            Limpiar Todo
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto min-h-0 bg-white rounded-lg border shadow-sm">
                <div className="max-h-full">
                    <Table>
                        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-[300px] bg-white">Número Telefónico</TableHead>
                                <TableHead className="bg-white">Estado</TableHead>
                                <TableHead className="text-right bg-white">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        <div className="flex items-center justify-center">
                                            <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mr-2" />
                                            <span className="text-slate-500">Cargando...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : numbers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center text-slate-500">
                                        {searchTerm ? "No se encontraron números que coincidan." : "No hay números en la lista negra."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                numbers.map((number) => (
                                    <TableRow key={number.phone_number} className="hover:bg-slate-50">
                                        <TableCell className="font-medium text-slate-900">{number.phone_number}</TableCell>
                                        <TableCell>
                                            <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-0">
                                                Bloqueado
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => confirmDelete(number.phone_number)}
                                                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Footer / Pagination */}
            {pagination.pages > 1 && (
                <div className="flex-shrink-0 mt-4 flex items-center justify-between px-2">
                    <div className="text-sm text-slate-500">
                        Mostrando {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium text-slate-700 min-w-[60px] text-center">
                            {pagination.page} / {pagination.pages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.pages}
                        >
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Add Number Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Bloquear Número</DialogTitle>
                        <DialogDescription>
                            Añade un número telefónico a la lista negra (DNC) para prevenir llamadas.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddNumber}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Número Telefónico</Label>
                                <Input
                                    id="phone"
                                    placeholder="Ej: 912345678"
                                    value={newNumber}
                                    onChange={(e) => setNewNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !newNumber}>
                                {isSubmitting ? "Bloquear" : "Bloquear"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Alert Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el número <span className="font-semibold text-slate-900">{numberToDelete}</span> de la lista negra.
                            El número podrá volver a recibir llamadas de las campañas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteNumber}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Confirmar Eliminación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Clear All Confirmation Dialog */}
            <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¡Atención! Esta acción es irreversible</AlertDialogTitle>
                        <AlertDialogDescription>
                            Estás a punto de eliminar <span className="font-bold text-red-600">{pagination.total}</span> números de la lista negra.
                            Esta acción no se puede deshacer. Todos los números podrán volver a recibir llamadas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setClearAllDialogOpen(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleClearAll}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Sí, Eliminar Todo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
