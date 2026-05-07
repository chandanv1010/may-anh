import React, { useMemo, useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/backend/dashboard' },
    { title: 'Lịch Máy', href: '#' },
];

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
}


const BookingInfoPopover = ({ booking, machineName, users }: { booking: any, machineName: string, users: any[] }) => {
    const order = booking.order;
    if (!order) return null;

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

export default function BookingCalendar({ machines, users, bookings, catalogues }: BookingCalendarProps) {
    const { auth } = usePage().props as any;
    const currentUser = auth.user;
    const isSuperAdmin = currentUser?.id === 1;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ machineId: number, date: string, slot: string } | null>(null);
    const [editingOrder, setEditingOrder] = useState<any>(null);
    
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
        const start = startOfWeek(currentDate, { locale: vi });
        return eachDayOfInterval({ start, end: addDays(start, 13) });
    }, [currentDate]);

    const prevPeriod = () => setCurrentDate(prev => addDays(prev, -14));
    const nextPeriod = () => setCurrentDate(prev => addDays(prev, 14));
    const today = () => setCurrentDate(new Date());

    const findBooking = (machineId: number, date: Date, slot: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return bookings.find(b => b.product_id === machineId && b.booking_date === dateStr && b.slot === slot);
    };

    const getUserColor = (userId: number | null) => {
        if (!userId) return '#3b82f6';
        const colors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', 
            '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'
        ];
        return colors[userId % colors.length];
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
            <div className="flex h-full flex-1 flex-col gap-4 p-4 page-wrapper overflow-hidden">
                <CustomPageHeading heading="Lịch Đặt Máy" breadcrumbs={breadcrumbs} />
                
                <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm border-none rounded-xl">
                    {/* Header Controls */}
                    <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center bg-white border rounded-lg overflow-hidden shadow-sm">
                                <Button variant="ghost" size="icon" onClick={prevPeriod} className="h-9 w-9 rounded-none hover:bg-slate-100">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="px-4 py-1 text-sm font-medium border-x flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4 text-blue-500" />
                                    {format(days[0], 'dd/MM')} - {format(days[days.length - 1], 'dd/MM/yyyy')}
                                </div>
                                <Button variant="ghost" size="icon" onClick={nextPeriod} className="h-9 w-9 rounded-none hover:bg-slate-100">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button variant="outline" size="sm" onClick={today} className="bg-white">
                                Hôm nay
                            </Button>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                             <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-[#4ade80] border border-green-500"></div>
                                <span>Trống</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-[#facc15] border border-yellow-500"></div>
                                <span>Đặt máy dự phòng</span>
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
                    <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/30">
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
            `}} />
        </AppLayout>
    );
}

const CalendarGrid = React.memo(({ days, slots, machines, users, findBooking, getUserColor, onCellDoubleClick, currentUser, isSuperAdmin }: any) => {
    const totalMinWidth = 200 + (days.length * slots.length * 32);
    
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
            className="border-collapse table-fixed border-spacing-0"
            style={{ width: 'max-content' }}
        >
            <colgroup>
                <col style={{ width: '200px' }} />
                {days.flatMap((_: any, dIdx: number) => 
                    slots.map((_: any, sIdx: number) => (
                        <col key={`${dIdx}-${sIdx}`} style={{ width: '36px' }} />
                    ))
                )}
            </colgroup>
            <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
                <tr>
                    <th 
                        style={{ width: '200px', minWidth: '200px' }}
                        className="sticky left-0 z-30 bg-slate-100 border-r border-b p-2 text-xs font-bold text-slate-600 h-16 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
                    >
                        Ngày<br/>Tên máy / Buổi
                    </th>
                    {days.map((day: any, idx: number) => (
                        <th key={idx} colSpan={slots.length} className={`border-r border-b p-1 text-center h-16 ${isSameDay(day, now) ? 'bg-blue-50' : ''}`}>
                            <div className="text-sm font-bold text-slate-700">{format(day, 'dd', { locale: vi })}</div>
                            <div className="text-[10px] uppercase text-slate-500">{format(day, 'EEEE', { locale: vi })}</div>
                        </th>
                    ))}
                </tr>
                <tr className="bg-slate-50">
                    <th className="sticky left-0 z-30 bg-slate-50 border-r border-b shadow-[2px_0_5px_rgba(0,0,0,0.05)] h-8"></th>
                    {days.map((day: any, dIdx: number) => (
                        <React.Fragment key={dIdx}>
                            {slots.map((slot: any, sIdx: number) => {
                                const isCurrentShift = isSameDay(day, now) && slot === currentShift;
                                return (
                                    <th 
                                        key={`${dIdx}-${sIdx}`} 
                                        style={{ width: '36px', minWidth: '36px' }}
                                        className={cn(
                                            "border-r border-b text-[10px] font-bold text-slate-400 h-8",
                                            isCurrentShift && "border-r-[2px] border-r-blue-600 relative z-20"
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
                        <td className="sticky left-0 z-10 bg-white border-r border-b p-2 text-xs font-medium text-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.03)] truncate">
                            {machine.name || 'Sản phẩm ' + (mIdx + 1)}
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
                                        } else if (isPast || booking.status === 'finished') {
                                            cellColor = '#15803d';
                                            isClickable = false;
                                            tooltip = `Đã thuê xong - Bởi: ${users.find((u: any) => u.id === booking.user_id)?.name || 'N/A'}`;
                                        } else {
                                            // IF it's a backup machine, the booking color is ALWAYS yellow
                                            cellColor = machine.is_backup ? '#facc15' : getUserColor(booking.user_id);
                                            tooltip = `Đặt bởi: ${users.find((u: any) => u.id === booking.user_id)?.name || 'N/A'}`;
                                        }
                                    } else if (isPast) {
                                        cellColor = '#4ade80';
                                        isClickable = false;
                                        tooltip = 'Thời gian đã qua (Không có khách thuê)';
                                    }
                                    
                                    const hasPermission = !booking || isSuperAdmin || (booking?.user_id === currentUser?.id) || (booking?.order?.staff_chot_id === currentUser?.id);
                                    const showPopover = !!(booking && booking.order && hasPermission);

                                    const innerBlock = (extraHandlers?: any) => (
                                        <div className="relative w-full h-full p-0.5 min-h-[40px]">
                                            <div 
                                                className="absolute inset-0.5 rounded-sm flex items-center justify-center shadow-sm transition-all"
                                                style={{
                                                    backgroundColor: cellColor,
                                                    border: cellColor === '#ffffff' ? '1px solid #e2e8f0' : 'none',
                                                }} 
                                                {...extraHandlers}
                                            >
                                                {booking && booking.status === 'maintenance' && (
                                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">BẢO TRÌ</span>
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
                                                        isCurrentShift && "border-r-[2px] border-r-blue-600 relative z-10"
                                                    )}
                                                >
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            {innerBlock({ onDoubleClick: () => onCellDoubleClick(machine.id, day, slot) })}
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-72 p-0 shadow-2xl border border-amber-200 rounded-xl bg-[#fffbeb] overflow-hidden" side="top" align="center">
                                                            <BookingInfoPopover booking={booking} machineName={machine.name} users={users} />
                                                        </PopoverContent>
                                                    </Popover>
                                                </td>
                                            ) : (
                                                <td
                                                    title={tooltip}
                                                    className={cn(
                                                        "border-r border-b p-0", 
                                                        (isClickable || booking) ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                                                        isCurrentShift && "border-r-[2px] border-r-blue-600 relative z-10"
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
