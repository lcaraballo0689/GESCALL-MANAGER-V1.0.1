import React, { useState, useEffect } from 'react';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    List,
    Target,
    Trash2,
    Play,
    Pause
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';
import api from '../services/api';
import { toast } from 'sonner';
import ScheduleModal from './ScheduleModal';

interface Schedule {
    id: number;
    schedule_type: 'list' | 'campaign';
    target_id: string;
    target_name: string;
    action: 'activate' | 'deactivate';
    scheduled_at: string;
    end_at: string | null;
    executed: boolean;
    recurring: 'none' | 'daily' | 'weekly' | 'monthly';
}

const ScheduleCalendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        fetchSchedules();
    }, [currentDate]);

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const response = await api.getUpcomingSchedules(
                startOfMonth.toISOString().slice(0, 10),
                endOfMonth.toISOString().slice(0, 10)
            );
            setSchedules(response as Schedule[]);
        } catch (error) {
            toast.error('Error al cargar programaciones');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSchedule = async (id: number) => {
        try {
            await api.deleteSchedule(id);
            toast.success('Programación eliminada');
            fetchSchedules();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];

        // Add empty slots for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const getSchedulesForDay = (date: Date | null) => {
        if (!date) return [];

        // Normalize the calendar date to midnight
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const checkTime = checkDate.getTime();

        return schedules.filter(s => {
            // Start date at midnight
            const startDate = new Date(s.scheduled_at);
            startDate.setHours(0, 0, 0, 0);
            const startTime = startDate.getTime();

            // If date is before start, don't show
            if (checkTime < startTime) return false;

            // End date (if defined)
            let endTime: number | null = null;
            if (s.end_at) {
                const endDate = new Date(s.end_at);
                endDate.setHours(23, 59, 59, 999);
                endTime = endDate.getTime();
            }

            // For NON-RECURRING events
            if (s.recurring === 'none') {
                if (endTime !== null) {
                    // Has end date: show on all days from start to end
                    return checkTime >= startTime && checkTime <= endTime;
                } else {
                    // No end date: show ONLY on start date
                    return checkTime === startTime;
                }
            }

            // For RECURRING events
            const daysDiff = Math.floor((checkTime - startTime) / (1000 * 60 * 60 * 24));

            switch (s.recurring) {
                case 'daily':
                    // Every day from start date onwards
                    return daysDiff >= 0;

                case 'weekly':
                    // Same day of week as start date
                    return daysDiff >= 0 && daysDiff % 7 === 0;

                case 'monthly':
                    // Same day of month as start date
                    const startDay = startDate.getDate();
                    const checkDay = checkDate.getDate();
                    return checkDay === startDay && checkTime >= startTime;

                default:
                    return false;
            }
        });
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDayClick = (date: Date | null) => {
        if (date) {
            setSelectedDate(date);
            setSelectedSchedule(null);
            setIsModalOpen(true);
        }
    };

    const handleScheduleClick = (schedule: Schedule, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedSchedule(schedule);
        setSelectedDate(null);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedSchedule(null);
        setSelectedDate(null);
        fetchSchedules();
    };

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Calendar className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Programador</h1>
                        <p className="text-muted-foreground">
                            Programa activación y desactivación de campañas y listas
                        </p>
                    </div>
                </div>
                <Button onClick={() => { setSelectedDate(new Date()); setIsModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Programación
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar - takes 2 columns */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" size="icon" onClick={prevMonth}>
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <CardTitle className="text-xl">
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={nextMonth}>
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {dayNames.map(day => (
                                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth().map((date, index) => {
                                const daySchedules = getSchedulesForDay(date);
                                const isToday = date?.toDateString() === new Date().toDateString();

                                return (
                                    <div
                                        key={index}
                                        onClick={() => handleDayClick(date)}
                                        className={cn(
                                            "min-h-[100px] p-2 rounded-lg border cursor-pointer transition-colors",
                                            date ? "hover:bg-muted/50" : "bg-transparent border-transparent",
                                            isToday && "border-primary bg-primary/5"
                                        )}
                                    >
                                        {date && (
                                            <>
                                                <div className={cn(
                                                    "text-sm font-medium mb-1",
                                                    isToday && "text-primary"
                                                )}>
                                                    {date.getDate()}
                                                </div>
                                                <div className="space-y-1">
                                                    {daySchedules.slice(0, 3).map(schedule => (
                                                        <div
                                                            key={schedule.id}
                                                            onClick={(e) => handleScheduleClick(schedule, e)}
                                                            className={cn(
                                                                "text-xs p-1 rounded truncate cursor-pointer",
                                                                schedule.action === 'activate'
                                                                    ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                                                    : "bg-red-500/20 text-red-700 dark:text-red-400",
                                                                schedule.executed && "opacity-50"
                                                            )}
                                                        >
                                                            {schedule.schedule_type === 'campaign' ? <Target className="h-3 w-3 inline mr-1" /> : <List className="h-3 w-3 inline mr-1" />}
                                                            {schedule.target_name || schedule.target_id}
                                                        </div>
                                                    ))}
                                                    {daySchedules.length > 3 && (
                                                        <div className="text-xs text-muted-foreground">
                                                            +{daySchedules.length - 3} más
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Upcoming schedules list - takes 1 column */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Próximas Programaciones
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-4 text-muted-foreground">Cargando...</div>
                        ) : schedules.filter(s => !s.executed).length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                                No hay programaciones pendientes
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {schedules.filter(s => !s.executed).slice(0, 10).map(schedule => (
                                    <div
                                        key={schedule.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            {schedule.schedule_type === 'campaign' ? (
                                                <Target className="h-5 w-5 text-blue-500" />
                                            ) : (
                                                <List className="h-5 w-5 text-purple-500" />
                                            )}
                                            <div>
                                                <div className="font-medium">{schedule.target_name || schedule.target_id}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {new Date(schedule.scheduled_at).toLocaleString('es-CO')}
                                                    {schedule.end_at && ` → ${new Date(schedule.end_at).toLocaleString('es-CO')}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={schedule.action === 'activate' ? 'default' : 'destructive'}>
                                                {schedule.action === 'activate' ? (
                                                    <><Play className="h-3 w-3 mr-1" /> Activar</>
                                                ) : (
                                                    <><Pause className="h-3 w-3 mr-1" /> Desactivar</>
                                                )}
                                            </Badge>
                                            {schedule.recurring !== 'none' && (
                                                <Badge variant="outline">{schedule.recurring}</Badge>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteSchedule(schedule.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ScheduleModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                schedule={selectedSchedule}
                defaultDate={selectedDate}
            />
        </div>
    );
};

export default ScheduleCalendar;
