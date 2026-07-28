import React, { useMemo, useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { BreadcrumbItem, Product, User } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Camera, Clock } from 'lucide-react';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from "@/lib/utils"
import { BookingFormModal } from '@/components/booking/booking-form-modal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/backend/dashboard' },
    { title: 'Lịch Máy', href: '#' },
];

const getCompactDayName = (day: Date) => {
    const dayNum = day.getDay();
    return dayNum === 0 ? 'CN' : `T${dayNum + 1}`;
};

interface Booking {
    id: number;
    product_id: number;
    user_id: number | null;
    booking_date: string;
    slot: string;
    status: string;
}

interface BookingCalendarProps {
    machines: Product[];
    users: User[];
    bookings: Booking[];
    catalogues: any[];
    isSuperAdmin: boolean;
    currentUser: User;
}


const BookingInfoPopover = ({ booking, machineName, users, onEdit }: { booking: any, machineName: string, users: any[], onEdit?: () => void }) => {
    const order = booking.order;

    // Khi không có order data: hiện fallback để mobile vẫn tap được
    if (!order) return (
        <div className="flex flex-col">
            <div className="bg-[#fde68a] px-3 py-2 border-b border-amber-200">
                <h4 className="font-bold text-slate-800 text-sm">Đơn hàng</h4>
            </div>
            <div className="p-4 text-center space-y-3">
                <p className="text-slate-500 text-xs">Không tải được thông tin đơn.</p>
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                    >
                        ✏️ Mở để chỉnh sửa
                    </button>
                )}
            </div>
        </div>
    );

    const roles = [
        { key: 'staff_chot_id', label: 'Chốt', icon: '💰' },
        { key: 'staff_giao_may_id', label: 'Giao máy', icon: '📦' },
        { key: 'staff_giao_khach_id', label: 'Giao khách', icon: '👤' },
        { key: 'staff_nhan_id', label: 'Nhận', icon: '✔' },
        { key: 'staff_giu_id', label: 'Giữ', icon: '👍' },
    ];

    return (
        <div className="flex flex-col">
            <div className="bg-[#fde68a] px-3 py-2 border-b border-amber-200">
                <h4 className="font-bold text-slate-800 text-sm">Đơn hàng</h4>
            </div>
            
            <div className="p-3 space-y-3">
                <div>
                    <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-blue-600 font-black text-sm">{new Intl.NumberFormat('vi-VN').format(order.final_amount)}đ</span>
                        <span className="text-slate-400">-</span>
                        <span className="text-slate-700 font-bold text-[13px]">{order.customer_name}</span>
                        <span className="text-slate-400">-</span>
                    </div>
                    <div className="text-slate-800 font-black text-[13px] mt-0.5">
                        {order.customer_phone}
                    </div>
                </div>

                <div className="space-y-1">
                    {roles.map(role => {
                        const userId = order[role.key];
                        if (!userId) return null;
                        const staff = users.find(u => u.id.toString() === userId.toString());
                        if (!staff) return null;
                        
                        return (
                            <div key={role.key} className="flex items-center gap-2 text-[13px]">
                                <span className="w-5 flex justify-center text-sm">{role.icon}</span>
                                <span className="text-slate-600 min-w-[75px]">{role.label}:</span>
                                <span className={cn(
                                    "font-bold",
                                    role.key === 'staff_chot_id' ? "text-red-600" : "text-slate-800"
                                )}>
                                    {staff.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
                
                {order.notes && (
                    <div className="bg-amber-100/50 p-2 rounded text-[11px] text-slate-600 italic border-l-2 border-amber-400">
                        "{order.notes}"
                    </div>
                )}
            </div>

            <div className="px-3 py-2 bg-amber-50/50 text-[9px] text-center text-amber-900/40 font-medium italic border-t border-amber-100">
                {machineName} • {format(new Date(booking.booking_date), 'dd/MM/yyyy')}
                <br/>
                Click đúp để chỉnh sửa đơn hàng
            </div>
        </div>
    );
};

export default function BookingCalendar({ machines, users, bookings, catalogues, isSuperAdmin, currentUser }: BookingCalendarProps) {

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ machineId: number, date: string, slot: string } | null>(null);
    const [editingOrder, setEditingOrder] = useState<any>(null);
    
    // Custom range state
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [customRange, setCustomRange] = useState<DateRange | undefined>(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const startStr = urlParams.get('start_date');
        const endStr = urlParams.get('end_date');
        if (startStr && endStr) {
            const [sY, sM, sD] = startStr.split('-').map(Number);
            const [eY, eM, eD] = endStr.split('-').map(Number);
            return {
                from: new Date(sY, sM - 1, sD),
                to: new Date(eY, eM - 1, eD)
            };
        }
        return undefined;
    });

    // Filtering State
    const [selectedCatalogues, setSelectedCatalogues] = useState<number[]>([]);

    // Filtered machines for the dropdown
    const filteredMachines = useMemo(() => {
        if (selectedCatalogues.length === 0) return machines;
        return machines.filter(m => 
            m.product_catalogues?.some((cat: any) => selectedCatalogues.includes(cat.id))
        );
    }, [machines, selectedCatalogues]);

    const handleCatalogueToggle = (id: number) => {
        setSelectedCatalogues(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Auto-open modal if order_id is in URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order_id');
        if (orderId && bookings.length > 0 && !isModalOpen && !editingOrder) {
            const booking = bookings.find(b => b.booking_order_id?.toString() === orderId);
            if (booking) {
                setEditingOrder(booking.order);
                setIsModalOpen(true);
                // Clear the order_id from URL to prevent re-opening on refresh
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [bookings, isModalOpen, editingOrder]);

    const slots = ['S', 'C', 'T'];
    const days = useMemo(() => {
        if (customRange?.from && customRange?.to) {
            const start = customRange.from;
            const end = customRange.to;
            return eachDayOfInterval({ start, end });
        }
        const start = startOfWeek(currentDate, { locale: vi });
        return eachDayOfInterval({ start, end: addDays(start, 13) });
    }, [currentDate, customRange]);

    const handleDateRangeChange = (range: DateRange | undefined) => {
        if (range?.from && range?.to) {
            const diffTime = Math.abs(range.to.getTime() - range.from.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (diffDays > 10) {
                toast.error("Khoảng ngày chọn không được vượt quá 10 ngày");
                return;
            }
            setCustomRange(range);
            setIsCalendarOpen(false);

            const startStr = format(range.from, 'yyyy-MM-dd');
            const endStr = format(range.to, 'yyyy-MM-dd');
            router.get(
                '/backend/booking/calendar',
                { start_date: startStr, end_date: endStr },
                { preserveState: true }
            );
        } else {
            setCustomRange(range);
            if (!range) {
                setIsCalendarOpen(false);
                router.get(
                    '/backend/booking/calendar',
                    {},
                    { preserveState: true }
                );
            }
        }
    };

    const prevPeriod = () => {
        if (customRange?.from && customRange?.to) {
            const diffTime = Math.abs(customRange.to.getTime() - customRange.from.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const newFrom = addDays(customRange.from, -diffDays);
            const newTo = addDays(customRange.to, -diffDays);
            const newRange = { from: newFrom, to: newTo };
            setCustomRange(newRange);
            router.get(
                '/backend/booking/calendar',
                { start_date: format(newFrom, 'yyyy-MM-dd'), end_date: format(newTo, 'yyyy-MM-dd') },
                { preserveState: true }
            );
        } else {
            setCurrentDate(prev => addDays(prev, -14));
        }
    };

    const nextPeriod = () => {
        if (customRange?.from && customRange?.to) {
            const diffTime = Math.abs(customRange.to.getTime() - customRange.from.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const newFrom = addDays(customRange.from, diffDays);
            const newTo = addDays(customRange.to, diffDays);
            const newRange = { from: newFrom, to: newTo };
            setCustomRange(newRange);
            router.get(
                '/backend/booking/calendar',
                { start_date: format(newFrom, 'yyyy-MM-dd'), end_date: format(newTo, 'yyyy-MM-dd') },
                { preserveState: true }
            );
        } else {
            setCurrentDate(prev => addDays(prev, 14));
        }
    };

    const today = () => {
        setCurrentDate(new Date());
        setCustomRange(undefined);
        router.get(
            '/backend/booking/calendar',
            {},
            { preserveState: true }
        );
    };

    // Scroll to today column when days change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const todayCol = document.getElementById('today-col');
            const container = document.getElementById('calendar-scroll-container');
            if (todayCol && container) {
                const isMobile = window.innerWidth <= 768;
                const offset = isMobile ? 120 : 200;
                container.scrollTo({ left: Math.max(0, todayCol.offsetLeft - offset), behavior: 'smooth' });
            }
        }, 100);
        return () => clearTimeout(timeoutId);
    }, [days]);

    const findBooking = (machineId: number, date: Date, slot: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return bookings.find(b => b.product_id === machineId && b.booking_date === dateStr && b.slot === slot && b.status !== 'cancelled' && b.status !== 'canceled');
    };

    // Lấy màu theo staff_chot_id của order (chính xác hơn booking.user_id)
    const getUserColor = (staffChotId: number | null | undefined) => {
        if (!staffChotId) return '#94a3b8';
        const user = users.find((u: any) => u.id === staffChotId);
        // Dùng đúng màu từ DB, fallback xám nếu chưa set
        return user?.color || '#94a3b8';
    };

    const handleCellDoubleClick = (machineId: number, date: Date, slot: string) => {
        const existingBooking = findBooking(machineId, date, slot);

        if (existingBooking && existingBooking.booking_order_id) {
            setEditingOrder({ ...existingBooking.order, _machine_id: machineId });
            setSelectedSlot(null);
            setIsModalOpen(true);
        } else {
            // NEW BOOKING
            if (date < startOfDay(new Date()) && !isSameDay(date, new Date())) {
                return;
            }

            const dateStr = format(date, 'yyyy-MM-dd');
            setEditingOrder(null);
            setSelectedSlot({ machineId, date: dateStr, slot });
            setIsModalOpen(true);
        }
    };


    const calendarGrid = useMemo(() => (
        <CalendarGrid 
            days={days} 
            slots={slots} 
            machines={machines} 
            users={users} 
            findBooking={findBooking} 
            getUserColor={getUserColor} 
            onCellDoubleClick={handleCellDoubleClick} 
            currentUser={currentUser}
            isSuperAdmin={isSuperAdmin}
        />
    ), [days, machines, users, bookings, currentDate, currentUser, isSuperAdmin]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Lịch Máy" />
            <div className="flex h-[calc(100dvh-4rem)] flex-1 flex-col gap-2 p-2 sm:gap-4 sm:p-4 page-wrapper overflow-hidden">
                <CustomPageHeading heading="Lịch Đặt Máy" breadcrumbs={breadcrumbs} />
                
                <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm border-none rounded-xl">
                    {/* Header Controls */}
                    <div className="p-3 md:p-4 border-b flex items-center justify-between bg-slate-50/50 card-controls-bar">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center bg-white border rounded-lg overflow-hidden shadow-sm date-picker-container">
                                <Button variant="ghost" size="icon" onClick={prevPeriod} className="h-9 w-9 rounded-none hover:bg-slate-100">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <button className="px-4 py-1 text-sm font-medium border-x flex items-center gap-2 date-display-text hover:bg-slate-50 cursor-pointer h-9 outline-none bg-transparent">
                                            <CalendarIcon className="h-4 w-4 text-blue-500" />
                                            {format(days[0], 'dd/MM')} - {format(days[days.length - 1], 'dd/MM/yyyy')}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="center">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={customRange?.from || currentDate}
                                            selected={customRange}
                                            onSelect={handleDateRangeChange}
                                            numberOfMonths={1}
                                            locale={vi}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Button variant="ghost" size="icon" onClick={nextPeriod} className="h-9 w-9 rounded-none hover:bg-slate-100">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button variant="outline" size="sm" onClick={today} className="bg-white today-button">
                                Hôm nay
                            </Button>
                        </div>
                        <div className="hidden xl:flex items-center gap-4 text-xs font-medium text-slate-500">
                             <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-[#4ade80] border border-green-500"></div>
                                <span>Trống</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-[#facc15] border border-yellow-500"></div>
                                <span>Đặt máy dự phòng</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-[#ef4444] border border-red-600"></div>
                                <span>Đang thuê</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-[#15803d] border border-green-800"></div>
                                <span>Đã thuê xong</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-white border border-slate-200"></div>
                                <span>Bảo trì</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-[#3b82f6] border border-blue-600"></div>
                                <span>Khách đặt (Màu User)</span>
                            </div>
                        </div>
                    </div>
                    <div id="calendar-scroll-container" className="flex-1 overflow-auto custom-scrollbar bg-slate-50/30">
                        {calendarGrid}
                    </div>
                </Card>
            </div>

            <BookingFormModal 
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                machines={machines}
                users={users}
                catalogues={catalogues}
                bookings={bookings}
                initialSlot={selectedSlot}
                editingOrder={editingOrder}
                onSuccess={() => setIsModalOpen(false)}
            />
            
            <style dangerouslySetInnerHTML={{ __html: `
                .calendar-table {
                    border-top: 1px solid #000000 !important;
                    border-left: 1px solid #000000 !important;
                }
                .calendar-table th, .calendar-table td {
                    border-right: 1px solid #000000 !important;
                    border-bottom: 1px solid #000000 !important;
                }
                .calendar-table td {
                    height: 1px;
                }
                .calendar-table .machine-col {
                    padding: 4px 8px !important;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                .mobile-zoom-table {
                    --slot-width: 38px;
                }
                @media (max-width: 768px) {
                    .mobile-zoom-table {
                        zoom: 0.9;
                        --slot-width: 28px;
                        width: calc(100px + var(--days-count) * var(--slots-count) * var(--slot-width)) !important;
                    }
                    .machine-col {
                        width: 100px !important;
                        min-width: 100px !important;
                        font-size: 12px !important;
                        padding: 4px 4px !important;
                    }
                    /* Increase text size inside the calendar table on mobile by 1px */
                    .calendar-table th, .calendar-table td {
                        font-size: 11px !important;
                    }
                    .calendar-table th .text-[10px] {
                        font-size: 11px !important;
                    }
                    .calendar-table th .text-sm {
                        font-size: 13px !important;
                    }
                    .calendar-table td span.text-[7px] {
                        font-size: 8px !important;
                    }
                }
                @media (min-width: 769px) {
                    .mobile-zoom-table {
                        width: calc(200px + var(--days-count) * var(--slots-count) * var(--slot-width)) !important;
                    }
                    .machine-col {
                        width: 200px !important;
                        min-width: 200px !important;
                    }
                }
                @media (max-width: 1024px), (max-height: 700px) {
                    .page-heading {
                        display: none !important;
                    }
                }
                @media (max-height: 500px) {
                    .page-wrapper {
                        padding: 4px !important;
                        gap: 4px !important;
                    }
                    .card-controls-bar {
                        padding: 4px 8px !important;
                    }
                    .date-picker-container {
                        height: 28px !important;
                    }
                    .date-picker-container button {
                        height: 26px !important;
                        width: 26px !important;
                    }
                    .date-display-text {
                        padding: 2px 8px !important;
                        font-size: 11px !important;
                    }
                    .today-button {
                        height: 28px !important;
                        font-size: 11px !important;
                        padding: 2px 8px !important;
                    }
                }
            `}} />
        </AppLayout>
    );
}

const CalendarGrid = React.memo(({ days, slots, machines, users, findBooking, getUserColor, onCellDoubleClick, currentUser, isSuperAdmin }: any) => {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const currentHour = now.getHours();
    let currentShift = 'S';
    if (currentHour >= 12 && currentHour < 18) currentShift = 'C';
    else if (currentHour >= 18) currentShift = 'T';

    return (
        <table 
            className="calendar-table border-collapse table-fixed border-spacing-0 mobile-zoom-table"
            style={{ 
                '--days-count': days.length,
                '--slots-count': slots.length,
            } as React.CSSProperties}
        >
            <colgroup>
                <col className="machine-col" />
                {days.flatMap((_: any, dIdx: number) => 
                    slots.map((_: any, sIdx: number) => (
                        <col key={`${dIdx}-${sIdx}`} style={{ width: 'var(--slot-width)' }} />
                    ))
                )}
            </colgroup>
            <thead className="sticky top-0 z-40 bg-slate-100 shadow-sm">
                <tr>
                    <th 
                        rowSpan={2}
                        className="sticky top-0 left-0 z-50 bg-slate-100 border-r border-b p-2 text-xs font-bold text-slate-600 shadow-[2px_0_5px_rgba(0,0,0,0.05)] machine-col"
                    >
                        Ngày<br/>Tên máy / Buổi
                    </th>
                    {days.map((day: any, idx: number) => (
                        <th key={idx} id={isSameDay(day, now) ? 'today-col' : undefined} colSpan={slots.length} className={`sticky top-0 z-30 border-r border-b p-1 text-center h-12 ${isSameDay(day, now) ? 'bg-blue-50' : 'bg-slate-100'}`}>
                            <div className="text-sm font-bold text-slate-700">{format(day, 'dd', { locale: vi })}</div>
                            <div className="hidden md:block text-[10px] uppercase text-slate-500">{format(day, 'EEEE', { locale: vi })}</div>
                            <div className="block md:hidden text-[10px] uppercase font-bold text-slate-500">{getCompactDayName(day)}</div>
                        </th>
                    ))}
                </tr>
                <tr className="bg-slate-50">
                    {days.map((day: any, dIdx: number) => (
                        <React.Fragment key={dIdx}>
                            {slots.map((slot: any, sIdx: number) => {
                                const isCurrentShift = isSameDay(day, now) && slot === currentShift;
                                return (
                                    <th 
                                        key={`${dIdx}-${sIdx}`} 
                                        style={{ width: 'var(--slot-width)', minWidth: 'var(--slot-width)' }}
                                        className={cn(
                                            "sticky top-12 z-30 bg-slate-50 border-r border-b text-[10px] font-bold text-slate-400 h-6",
                                            isCurrentShift && "border-l-[2px] border-l-blue-600"
                                        )}
                                    >
                                        {slot}
                                    </th>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </tr>
            </thead>
            <tbody>
                {machines.length > 0 ? machines.map((machine: any, mIdx: number) => (
                    <tr key={mIdx} className="hover:bg-slate-50 transition-colors">
                        <td className="sticky left-0 z-20 bg-white border-r border-b p-2 text-xs font-medium text-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.03)] truncate machine-col">
                            {mIdx + 1}. {machine.name || 'Sản phẩm ' + (mIdx + 1)}
                        </td>
                        {days.map((day: any, dIdx: number) => (
                            <React.Fragment key={dIdx}>
                                {slots.map((slot: any, sIdx: number) => {
                                    const isCurrentShift = isSameDay(day, now) && slot === currentShift;
                                    const isPast = day < startOfDay(now) || (isSameDay(day, now) && slots.indexOf(slot) < slots.indexOf(currentShift));
                                    const booking = findBooking(machine.id, day, slot);
                                    let cellColor = '#4ade80';
                                    let isClickable = true;
                                    let tooltip = `${machine.name} - ${format(day, 'dd/MM')} - Buổi ${slot}`;
                                    
                                    if (booking) {
                                        if (booking.status === 'maintenance') {
                                            cellColor = '#ffffff';
                                            isClickable = true;
                                            tooltip = 'Bảo trì';
                                        } else if (booking.status === 'renting') {
                                            // Đang thuê → đỏ, không phụ thuộc màu user
                                            cellColor = '#ef4444';
                                            const staffChotId = booking.order?.staff_chot_id ?? booking.user_id;
                                            tooltip = `Đang thuê - Bởi: ${users.find((u: any) => u.id === staffChotId)?.name || 'N/A'}`;
                                        } else if (isPast || booking.status === 'finished') {
                                            cellColor = '#15803d';
                                            isClickable = false;
                                            tooltip = `Đã thuê xong - Bởi: ${users.find((u: any) => u.id === booking.user_id)?.name || 'N/A'}`;
                                        } else {
                                            // IF it's a backup machine, the booking color is ALWAYS yellow
                                            // Dùng staff_chot_id từ order để lấy đúng màu user
                                            const staffChotId = booking.order?.staff_chot_id ?? booking.user_id;
                                            cellColor = machine.is_backup ? '#facc15' : getUserColor(staffChotId);
                                            tooltip = `Đặt bởi: ${users.find((u: any) => u.id === staffChotId)?.name || 'N/A'}`;
                                        }
                                    } else if (isPast) {
                                        cellColor = '#4ade80';
                                        isClickable = false;
                                        tooltip = 'Thời gian đã qua (Không có khách thuê)';
                                    }
                                    
                                    // Có quyền xem/sửa nếu: superadmin, hoặc là người chốt đơn, hoặc có user_id trên slot khớp
                                    const hasPermission = !booking || isSuperAdmin 
                                        || (booking?.order?.staff_chot_id != null && booking?.order?.staff_chot_id === currentUser?.id)
                                        || (booking?.user_id != null && booking?.user_id === currentUser?.id);
                                    // showPopover: chỉ cần booking + permission, không cần booking.order
                                    // → mobile có thể tap 1 lần để xem/sửa (không cần double-tap)
                                    const showPopover = !!(booking && hasPermission);

                                    const innerBlock = (extraHandlers?: any) => (
                                        <div className="relative w-full h-full min-h-[22px]">
                                            <div 
                                                className="absolute inset-0 flex items-center justify-center transition-all"
                                                style={{
                                                    backgroundColor: cellColor,
                                                }} 
                                                {...extraHandlers}
                                            >
                                                {booking && booking.status === 'maintenance' && (
                                                    <span className="text-[7px] font-black text-slate-800 uppercase tracking-tighter">BẢO TRÌ</span>
                                                )}
                                            </div>
                                        </div>
                                    );

                                    return (
                                        <React.Fragment key={`${dIdx}-${sIdx}`}>
                                            {showPopover ? (
                                                <td 
                                                    title={tooltip} 
                                                    className={cn(
                                                        "border-r border-b p-0 cursor-pointer",
                                                        isCurrentShift && "border-l-[2px] border-l-blue-600 relative z-10"
                                                    )}
                                                >
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            {innerBlock({ onDoubleClick: () => onCellDoubleClick(machine.id, day, slot) })}
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-72 p-0 shadow-2xl border border-amber-200 rounded-xl bg-[#fffbeb] overflow-hidden" side="top" align="center">
                                                            <BookingInfoPopover
                                                                booking={booking}
                                                                machineName={machine.name}
                                                                users={users}
                                                                onEdit={() => onCellDoubleClick(machine.id, day, slot)}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </td>
                                            ) : (
                                                <td
                                                    title={tooltip}
                                                    className={cn(
                                                        "border-r border-b p-0", 
                                                        (isClickable || booking) ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                                                        isCurrentShift && "border-l-[2px] border-l-blue-600 relative z-10"
                                                    )}
                                                    onDoubleClick={() => { if (hasPermission && (isClickable || booking)) onCellDoubleClick(machine.id, day, slot); }}
                                                >
                                                    {innerBlock()}
                                                </td>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tr>
                )) : (
                    <tr>
                        <td colSpan={days.length * slots.length + 1} className="p-8 text-center text-slate-400">
                            Chưa có máy nào trong danh sách.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
});
