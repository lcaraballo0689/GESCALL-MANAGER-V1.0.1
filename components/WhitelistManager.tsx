import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Plus, Trash2, ArrowLeft, ArrowRight, CheckCircle, XCircle, ListChecks, ToggleLeft, ToggleRight, Filter, FilterX } from "lucide-react";
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
} from "./ui/alert-dialog";

interface WhitelistPrefix {
    id: number;
    prefix: string;
    description: string;
    is_active: number;
    created_at: string;
}

export function WhitelistManager() {
    const [prefixes, setPrefixes] = useState<WhitelistPrefix[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 1
    });

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newPrefix, setNewPrefix] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Validation state
    const [validateNumber, setValidateNumber] = useState("");
    const [validationResult, setValidationResult] = useState<{ valid: boolean; message?: string; prefix?: WhitelistPrefix } | null>(null);

    // Delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [prefixToDelete, setPrefixToDelete] = useState<WhitelistPrefix | null>(null);

    // Filter state
    const [isApplyingFilter, setIsApplyingFilter] = useState(false);
    const [isClearingFilter, setIsClearingFilter] = useState(false);

    const fetchPrefixes = async (page = 1, search = "") => {
        setLoading(true);
        try {
            const response = await apiService.getWhitelistPrefixes(pagination.limit, page, search);
            if (response.success) {
                setPrefixes(response.data);
                setPagination(response.pagination);
            } else {
                toast.error("Error al cargar la lista blanca");
            }
        } catch (error) {
            console.error("Error fetching whitelist:", error);
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchPrefixes(1, searchTerm);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            fetchPrefixes(newPage, searchTerm);
        }
    };

    const handleAddPrefix = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPrefix.trim()) return;

        const cleanPrefix = newPrefix.replace(/[^0-9]/g, '');
        if (cleanPrefix.length !== 3) {
            toast.error("El prefijo debe tener exactamente 3 dígitos");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiService.addWhitelistPrefix(cleanPrefix, newDescription);
            if (response.success) {
                toast.success("Prefijo añadido exitosamente");
                setIsAddModalOpen(false);
                setNewPrefix("");
                setNewDescription("");
                fetchPrefixes(1, searchTerm);
            } else {
                toast.error(response.error || "Error al añadir prefijo");
            }
        } catch (error: any) {
            console.error("Error adding prefix:", error);
            toast.error(error.message || "Error al añadir prefijo");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = (prefix: WhitelistPrefix) => {
        setPrefixToDelete(prefix);
        setDeleteDialogOpen(true);
    };

    const handleDeletePrefix = async () => {
        if (!prefixToDelete) return;

        try {
            const response = await apiService.deleteWhitelistPrefix(prefixToDelete.id);
            if (response.success) {
                toast.success("Prefijo eliminado de la lista blanca");
                fetchPrefixes(pagination.page, searchTerm);
            } else {
                toast.error(response.error || "Error al eliminar prefijo");
            }
        } catch (error) {
            console.error("Error deleting prefix:", error);
            toast.error("Error al eliminar prefijo");
        } finally {
            setDeleteDialogOpen(false);
            setPrefixToDelete(null);
        }
    };

    const handleToggleActive = async (prefix: WhitelistPrefix) => {
        try {
            const response = await apiService.updateWhitelistPrefix(prefix.id, { is_active: !prefix.is_active });
            if (response.success) {
                toast.success(prefix.is_active ? "Prefijo desactivado" : "Prefijo activado");
                fetchPrefixes(pagination.page, searchTerm);
            } else {
                toast.error(response.error || "Error al actualizar prefijo");
            }
        } catch (error) {
            console.error("Error toggling prefix:", error);
            toast.error("Error al actualizar prefijo");
        }
    };

    const handleValidateNumber = async () => {
        if (!validateNumber.trim()) return;

        const cleanNumber = validateNumber.replace(/[^0-9]/g, '');
        if (cleanNumber.length !== 10) {
            setValidationResult({ valid: false, message: "El número debe tener 10 dígitos" });
            return;
        }

        try {
            const response = await apiService.validateWhitelistNumber(cleanNumber);
            setValidationResult(response);
        } catch (error) {
            console.error("Error validating number:", error);
            setValidationResult({ valid: false, message: "Error de validación" });
        }
    };

    const handleApplyFilter = async () => {
        setIsApplyingFilter(true);
        try {
            const response = await apiService.applyWhitelistFilter();
            if (response.success) {
                toast.success(`Filtro aplicado: ${response.data.leadsFiltered} leads filtrados, ${response.data.removedFromHopper} removidos del hopper`);
            } else {
                toast.error(response.message || "Error al aplicar filtro");
            }
        } catch (error: any) {
            console.error("Error applying filter:", error);
            toast.error(error.message || "Error al aplicar filtro");
        } finally {
            setIsApplyingFilter(false);
        }
    };

    const handleClearFilter = async () => {
        setIsClearingFilter(true);
        try {
            const response = await apiService.clearWhitelistFilter();
            if (response.success) {
                toast.success(`Filtro limpiado: ${response.data.leadsRestored} leads restaurados`);
            } else {
                toast.error(response.message || "Error al limpiar filtro");
            }
        } catch (error: any) {
            console.error("Error clearing filter:", error);
            toast.error(error.message || "Error al limpiar filtro");
        } finally {
            setIsClearingFilter(false);
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex-shrink-0 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Lista Blanca (Prefijos)</h1>
                        <p className="text-slate-500 text-sm">Administra los prefijos de 3 dígitos aceptados para planes de marcado de 10 dígitos.</p>
                    </div>
                </div>
            </div>

            {/* Validation Section */}
            <div className="flex-shrink-0 mb-6 p-4 bg-slate-50 rounded-lg border">
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Validar Número</h2>
                <div className="flex gap-2 items-center">
                    <Input
                        placeholder="Ingresa un número de 10 dígitos..."
                        value={validateNumber}
                        onChange={(e) => {
                            setValidateNumber(e.target.value.replace(/[^0-9]/g, ''));
                            setValidationResult(null);
                        }}
                        className="max-w-xs"
                        maxLength={10}
                    />
                    <Button onClick={handleValidateNumber} variant="outline">
                        Validar
                    </Button>
                    {validationResult && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${validationResult.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {validationResult.valid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {validationResult.valid ? `Aceptado (${validationResult.prefix?.description || validationResult.prefix?.prefix})` : validationResult.message}
                        </div>
                    )}
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex-shrink-0 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="relative flex-1 sm:max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar prefijo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        <Button onClick={() => setIsAddModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Añadir Prefijo
                        </Button>
                        <Button
                            onClick={handleApplyFilter}
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={isApplyingFilter || prefixes.filter(p => p.is_active).length === 0}
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            {isApplyingFilter ? "Aplicando..." : "Aplicar Filtro"}
                        </Button>
                        <Button
                            onClick={handleClearFilter}
                            variant="outline"
                            disabled={isClearingFilter}
                        >
                            <FilterX className="w-4 h-4 mr-2" />
                            {isClearingFilter ? "Limpiando..." : "Limpiar Filtro"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto min-h-0 bg-white rounded-lg border shadow-sm">
                <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[120px] bg-white">Prefijo</TableHead>
                            <TableHead className="bg-white">Descripción</TableHead>
                            <TableHead className="bg-white">Estado</TableHead>
                            <TableHead className="text-right bg-white">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                    Cargando...
                                </TableCell>
                            </TableRow>
                        ) : prefixes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                    {searchTerm ? "No se encontraron prefijos." : "No hay prefijos en la lista blanca."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            prefixes.map((prefix) => (
                                <TableRow key={prefix.id} className="hover:bg-slate-50">
                                    <TableCell className="font-mono font-bold text-lg text-slate-900">{prefix.prefix}</TableCell>
                                    <TableCell className="text-slate-600">{prefix.description || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={prefix.is_active ? "default" : "secondary"} className={prefix.is_active ? "bg-green-100 text-green-800 border-0" : ""}>
                                            {prefix.is_active ? "Activo" : "Inactivo"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggleActive(prefix)}
                                                className="text-slate-500 hover:text-blue-600"
                                                title={prefix.is_active ? "Desactivar" : "Activar"}
                                            >
                                                {prefix.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => confirmDelete(prefix)}
                                                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex-shrink-0 mt-4 flex items-center justify-between px-2">
                    <div className="text-sm text-slate-500">
                        Mostrando {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium text-slate-700 min-w-[60px] text-center">
                            {pagination.page} / {pagination.pages}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.pages}>
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Add Prefix Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Añadir Prefijo</DialogTitle>
                        <DialogDescription>
                            Añade un prefijo de 3 dígitos a la lista blanca de planes de marcado aceptados.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddPrefix}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="prefix">Prefijo (3 dígitos)</Label>
                                <Input
                                    id="prefix"
                                    placeholder="Ej: 310"
                                    value={newPrefix}
                                    onChange={(e) => setNewPrefix(e.target.value.replace(/[^0-9]/g, ''))}
                                    maxLength={3}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descripción (opcional)</Label>
                                <Input
                                    id="description"
                                    placeholder="Ej: Claro, Movistar, etc."
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting || newPrefix.length !== 3}>
                                {isSubmitting ? "Guardando..." : "Añadir"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar prefijo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el prefijo <span className="font-semibold text-slate-900">{prefixToDelete?.prefix}</span> de la lista blanca.
                            Los números con este prefijo ya no serán aceptados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePrefix} className="bg-red-600 hover:bg-red-700 text-white">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
