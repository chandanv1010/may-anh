import React, { useMemo, useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { BreadcrumbItem, Product, User } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User as UserIcon, Phone, Camera, Clock, BadgePercent, Wallet, NotebookPen, X, PlusCircle, AlertCircle } from 'lucide-react';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay, isBefore, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { PriceInput } from '@/components/price-input';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

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

const DatePicker = ({ value, onChange, minDate }: { value: string, onChange: (val: string) => void, minDate?: string }) => {
    const date = value ? new Date(value) : undefined;
    const min = minDate ? new Date(minDate) : undefined;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "flex-1 justify-start text-left font-normal h-11 min-h-[44px] bg-white border-slate-200 px-3",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                    {date ? format(date, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && onChange(format(d, 'yyyy-MM-dd'))}
                    disabled={(d) => (min ? startOfDay(d) < startOfDay(min) : false)}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
};

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
    const [selectedSlot, setSelectedSlot] = useState<{ machineId: number, date: Date, slot: string } | null>(null);
    
    // Filtering State
    const [selectedCatalogues, setSelectedCatalogues] = useState<number[]>([]);

    // Booking Form State
    const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
    const [rentalPeriods, setRentalPeriods] = useState<{ startSlot: string, startDate: string, endSlot: string, endDate: string }[]>([]);
    const [pricingMode, setPricingMode] = useState<'auto' | 'edit'>('auto');
    const [manualPrice, setManualPrice] = useState<number | undefined>(0);
    const [applyPromotion, setApplyPromotion] = useState(false);
    const [promotionMode, setPromotionMode] = useState<'money' | 'percent'>('money');
    const [promotionAmount, setPromotionAmount] = useState<number | undefined>(0);
    const [promotionReason, setPromotionReason] = useState('');
    const [depositInfo, setDepositInfo] = useState('');
    const [notes, setNotes] = useState('');
    const [overlapError, setOverlapError] = useState<string | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderStatus, setOrderStatus] = useState('pending');
    const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
    const [staffRoles, setStaffRoles] = useState<{ [key: string]: string }>({
        'chot': '',
        'giao_may': '',
        'giao_khach': '',
        'nhan': '',
        'giu': ''
    });

    const [source, setSource] = useState('FB');
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [customerData, setCustomerData] = useState({ name: '', phone: '' });

    // Filtered machines for the dropdown
    const filteredMachines = useMemo(() => {
        if (selectedCatalogues.length === 0) return machines;
        return machines.filter(m => 
            m.product_catalogues.some((cat: any) => selectedCatalogues.includes(cat.id))
        );
    }, [machines, selectedCatalogues]);

    const handleCatalogueToggle = (id: number) => {
        setSelectedCatalogues(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleCustomerSearch = async (query: string) => {
        setCustomerSearch(query);
        setCustomerData({ ...customerData, name: query });
        
        if (query.length >= 1) {
            setIsSearching(true);
            try {
                const response = await fetch(`/backend/booking/search-customer?query=${encodeURIComponent(query)}`);
                const data = await response.json();
                setCustomerSuggestions(data);
            } catch (error) {
                console.error('Search failed', error);
            } finally {
                setIsSearching(false);
            }
        } else {
            setCustomerSuggestions([]);
        }
    };

    const selectCustomer = (customer: any) => {
        setCustomerData({ name: customer.name, phone: customer.phone || '' });
        setCustomerSearch(customer.name);
        setCustomerSuggestions([]);
        setSelectedCustomer(customer);
    };

    // Pricing Logic
    const slotsList = ['S', 'C', 'T'];

    const countSessionsInPeriod = (startSlot: string, startDate: string, endSlot: string, endDate: string) => {
        const startVal = getSlotValue(startDate, startSlot);
        const endVal = getSlotValue(endDate, endSlot);
        return Math.max(0, endVal - startVal + 1);
    };

    const getSlotValue = (date: string, slot: string) => {
        const [y, m, d] = date.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        dt.setHours(0, 0, 0, 0);
        const time = Math.floor(dt.getTime() / (1000 * 60 * 60 * 24));
        const offset = slotsList.indexOf(slot);
        return time * 3 + offset;
    };



    const validateOverlaps = (periods: typeof rentalPeriods) => {
        setOverlapError(null);
        
        // 1. Check internal overlaps (between chosen periods)
        for (let i = 0; i < periods.length; i++) {
            const p1 = periods[i];
            const p1Start = getSlotValue(p1.startDate, p1.startSlot);
            const p1End = getSlotValue(p1.endDate, p1.endSlot);

            if (p1End < p1Start) {
                setOverlapError(`Khoảng ${i + 1}: Thời điểm kết thúc phải sau thời điểm bắt đầu.`);
                return false;
            }

            for (let j = i + 1; j < periods.length; j++) {
                const p2 = periods[j];
                const p2Start = getSlotValue(p2.startDate, p2.startSlot);
                const p2End = getSlotValue(p2.endDate, p2.endSlot);

                if (p1Start <= p2End && p2Start <= p1End) {
                    setOverlapError(`Khoảng ${i + 1} và khoảng ${j + 1} bị trùng lặp thời gian.`);
                    return false;
                }
            }
        }

        // 2. Check against existing bookings for this machine
        if (selectedMachineId) {
            for (const p of periods) {
                const pStart = getSlotValue(p.startDate, p.startSlot);
                const pEnd = getSlotValue(p.endDate, p.endSlot);

                const conflicts = bookings.filter(b => {
                    if (b.product_id !== selectedMachineId) return false;
                    if (editingOrderId && b.booking_order_id === editingOrderId) return false;
                    const bVal = getSlotValue(b.booking_date, b.slot);
                    return bVal >= pStart && bVal <= pEnd;
                });

                if (conflicts.length > 0) {
                    const first = conflicts[0];
                    setOverlapError(`Máy đã có người đặt vào ngày ${format(new Date(first.booking_date), 'dd/MM')} buổi ${first.slot}.`);
                    return false;
                }
            }
        }

        return true;
    };

    useEffect(() => {
        validateOverlaps(rentalPeriods);
    }, [rentalPeriods, selectedMachineId, bookings]);

    const totalSessions = useMemo(() => {
        return rentalPeriods.reduce((acc, p) => acc + countSessionsInPeriod(p.startSlot, p.startDate, p.endSlot, p.endDate), 0);
    }, [rentalPeriods]);

    const selectedMachine = useMemo(() => {
        return machines.find(m => m.id === selectedMachineId);
    }, [selectedMachineId, machines]);

    const basePrice = useMemo(() => {
        if (!selectedMachine) return 0;
        
        const p6h = Number(selectedMachine.price_6h) || 0;
        const p1d = Number(selectedMachine.price_1d) || 0;
        const p3d = Number(selectedMachine.price_3d) || 0;

        if (totalSessions === 0) return 0;
        
        const allSlots = new Set<number>();
        rentalPeriods.forEach(p => {
            const start = getSlotValue(p.startDate, p.startSlot);
            const end = getSlotValue(p.endDate, p.endSlot);
            for (let i = start; i <= end; i++) {
                allSlots.add(i);
            }
        });
        const sortedSlots = Array.from(allSlots).sort((a, b) => a - b);

        const blocks: number[][] = [];
        let currentBlock: number[] = [];
        sortedSlots.forEach(s => {
            if (currentBlock.length === 0 || s === currentBlock[currentBlock.length - 1] + 1) {
                currentBlock.push(s);
            } else {
                blocks.push(currentBlock);
                currentBlock = [s];
            }
        });
        if (currentBlock.length > 0) blocks.push(currentBlock);

        let total = 0;
        blocks.forEach(block => {
            const sessions = block.length;
            if (sessions === 1) {
                total += p6h;
            } else if (sessions === 2) {
                // Theo yêu cầu: 2 buổi liền nhau tính bằng giá 1 ngày
                total += p1d;
            } else {
                const days = sessions / 3; // 3 sessions = 1 day
                const rate = sessions >= 9 ? p3d : p1d; // 9 sessions = 3 days
                total += days * rate;
            }
        });

        return total;
    }, [totalSessions, selectedMachine, rentalPeriods]);

    const calculatedPrice = useMemo(() => {
        let price = basePrice;
        const customerDiscountPercent = selectedCustomer?.discount_percent || 0;
        if (customerDiscountPercent > 0) {
            price = price * (1 - customerDiscountPercent / 100);
        }
        return Math.round(price);
    }, [basePrice, selectedCustomer]);

    const finalPrice = useMemo(() => {
        if (pricingMode === 'edit') return manualPrice || 0;
        let price = calculatedPrice;
        if (applyPromotion) {
            if (promotionMode === 'money') {
                price = Math.max(0, price - (promotionAmount || 0));
            } else {
                // Giảm % dựa trên GIÁ GỐC (basePrice)
                const discountFromBase = (basePrice * (promotionAmount || 0) / 100);
                price = Math.max(0, price - discountFromBase);
            }
        }
        return Math.round(price);
    }, [calculatedPrice, basePrice, applyPromotion, promotionMode, promotionAmount, pricingMode, manualPrice]);

    const handleAddPeriod = () => {
        const lastPeriod = rentalPeriods[rentalPeriods.length - 1];
        const lastEndVal = getSlotValue(lastPeriod.endDate, lastPeriod.endSlot);
        
        // Start from the very next slot
        const nextStartVal = lastEndVal + 1;
        
        // Convert linear value back to date and slot
        const timeValue = Math.floor(nextStartVal / 3);
        const slotIdx = nextStartVal % 3;
        
        // Base reference date (start of year 2026 for consistent mapping)
        const baseDate = new Date(2026, 0, 1);
        const refVal = getSlotValue('2026-01-01', 'S');
        const diffDays = timeValue - Math.floor(refVal / 3);
        
        const dt = new Date(baseDate.getTime() + diffDays * (1000 * 60 * 60 * 24));
        const nextStartDate = format(dt, 'yyyy-MM-dd');
        const nextStartSlot = slotsList[slotIdx];

        const newPeriods = [...rentalPeriods, { 
            startSlot: nextStartSlot, 
            startDate: nextStartDate, 
            endSlot: nextStartSlot, 
            endDate: nextStartDate 
        }];
        setRentalPeriods(newPeriods);
        validateOverlaps(newPeriods);
    };

    const handleRemovePeriod = (index: number) => {
        if (rentalPeriods.length > 1) {
            setRentalPeriods(rentalPeriods.filter((_, i) => i !== index));
        }
    };

    const updatePeriod = (index: number, field: string, value: string) => {
        const newPeriods = [...rentalPeriods];
        const updated = { ...newPeriods[index], [field]: value };
        
        // Ensure endDate >= startDate
        if (field === 'startDate') {
            const start = new Date(value);
            const end = new Date(updated.endDate);
            if (end < start) {
                updated.endDate = value;
            }
        }
        
        newPeriods[index] = updated;
        setRentalPeriods(newPeriods);
    };

    const handleMachineChange = (id: string) => {
        const machineId = parseInt(id);
        setSelectedMachineId(machineId);
        const machine = machines.find(m => m.id === machineId);
        if (machine) {
            setDepositInfo(machine.deposit || '');
        }
    };

    const todayString = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    // Generate 14 days from current start of week for display
    const days = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        return eachDayOfInterval({
            start: start,
            end: addDays(start, 13),
        });
    }, [currentDate]);

    const slots = ['S', 'C', 'T']; // Sáng, Chiều, Tối

    const nextPeriod = () => setCurrentDate(addDays(currentDate, 7));
    const prevPeriod = () => setCurrentDate(addDays(currentDate, -7));
    const today = () => setCurrentDate(new Date());

    const findBooking = (productId: number, date: Date, slot: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return bookings.find(b => 
            b.product_id === productId && 
            b.booking_date === dateStr && 
            b.slot === slot
        );
    };

    const getUserColor = (userId: number | null) => {
        if (!userId) return '#3b82f6';
        const user = users.find(u => u.id === userId);
        return (user?.color as string) || '#3b82f6';
    };

    const handleCellDoubleClick = (machineId: number, date: Date, slot: string) => {
        const existingBooking = findBooking(machineId, date, slot);

        if (existingBooking && existingBooking.booking_order_id) {
            // EDIT MODE (Load existing order)
            const order = existingBooking.order;
            if (!order) return;

            setEditingOrderId(order.id);
            setSelectedMachineId(machineId);
            setCustomerSearch(order.customer_name);
            setCustomerData({ name: order.customer_name, phone: order.customer_phone });
            
            // Re-populate customer info
            const cust = { 
                id: order.customer_id, 
                name: order.customer_name, 
                phone: order.customer_phone, 
                discount_percent: Number(order.customer_discount_percent) || 0 
            };
            setSelectedCustomer(cust);

            setSource(order.source || 'FB');
            setOrderStatus(order.status || 'pending');
            setNotes(order.notes || '');
            setDepositInfo(order.deposit_info || '');
            setStaffRoles({
                'chot': order.staff_chot_id?.toString() || '',
                'giao_may': order.staff_giao_may_id?.toString() || '',
                'giao_khach': order.staff_giao_khach_id?.toString() || '',
                'nhan': order.staff_nhan_id?.toString() || '',
                'giu': order.staff_giu_id?.toString() || '',
            });

            // Rebuild periods for this order/machine
            const orderSlots = bookings.filter(b => b.booking_order_id === order.id && b.product_id === machineId);
            if (orderSlots.length > 0) {
                const sorted = orderSlots.sort((a, b) => {
                    const da = new Date(a.booking_date).getTime();
                    const db = new Date(b.booking_date).getTime();
                    if (da !== db) return da - db;
                    const slotOrder: any = { 'S': 0, 'C': 1, 'T': 2 };
                    return slotOrder[a.slot] - slotOrder[b.slot];
                });
                const first = sorted[0];
                const last = sorted[sorted.length - 1];
                setRentalPeriods([{
                    startDate: first.booking_date,
                    startSlot: first.slot,
                    endDate: last.booking_date,
                    endSlot: last.slot
                }]);
            }
            
            // Populate Promotion info
            if (Number(order.promotion_value) > 0) {
                setApplyPromotion(true);
                setPromotionMode(order.promotion_type as 'money' | 'percent' || 'money');
                setPromotionAmount(Number(order.promotion_value));
                setPromotionReason(order.discount_reason || '');
            } else {
                setApplyPromotion(false);
                setPromotionAmount(0);
                setPromotionReason('');
            }

            // Default to 'edit' mode when opening existing order to preserve saved price
            setPricingMode('edit');
            setManualPrice(Number(order.final_amount));
            setOverlapError(null);
        } else {
            // NEW BOOKING
            if (date < startOfDay(new Date()) && !isSameDay(date, new Date())) {
                return;
            }

            const dateStr = format(date, 'yyyy-MM-dd');
            setEditingOrderId(null);
            setSelectedMachineId(machineId);
            setRentalPeriods([{ startSlot: slot, startDate: dateStr, endSlot: slot, endDate: dateStr }]);
            
            setCustomerSearch('');
            setCustomerData({ name: '', phone: '' });
            setSelectedCustomer(null);
            setNotes('');
            setSource('FB');
            setOrderStatus('pending');
            setStaffRoles({ 
                'chot': currentUser?.id?.toString() || '', 
                'giao_may': '', 
                'giao_khach': '', 
                'nhan': '', 
                'giu': '' 
            });
            setPricingMode('auto');
            setManualPrice(0);
            setApplyPromotion(false);
            setPromotionAmount(0);
            setPromotionReason('');
            setOverlapError(null);

            const machine = machines.find(m => m.id === machineId);
            if (machine) setDepositInfo(machine.deposit || '');
        }

        setIsModalOpen(true);
    };

    const isLocked = editingOrderId !== null && orderStatus !== 'pending';

    const handleSaveBooking = async () => {
        if (!selectedMachineId || rentalPeriods.length === 0) {
            alert('Vui lòng chọn máy và thời gian thuê.');
            return;
        }

        if (orderStatus !== 'maintenance' && (!customerData.name || !customerData.phone)) {
            alert('Vui lòng nhập đầy đủ thông tin khách hàng.');
            return;
        }

        setIsSubmitting(true);
        const url = editingOrderId 
            ? `/backend/booking/update/${editingOrderId}` 
            : '/backend/booking/store';

        const payload = {
            product_id: selectedMachineId,
            customer_name: customerData.name,
            customer_phone: customerData.phone,
            customer_discount_percent: selectedCustomer?.discount_percent || 0,
            customer_id: selectedCustomer?.id || null,
            source: source,
            status: orderStatus,
            rental_periods: rentalPeriods,
            pricing_mode: pricingMode,
            manual_price: manualPrice,
            apply_promotion: applyPromotion,
            promotion_mode: promotionMode,
            promotion_amount: promotionAmount,
            promotion_reason: promotionReason,
            deposit_info: depositInfo,
            notes: notes,
            staff_roles: staffRoles,
            total_amount: basePrice,
            discount_amount: basePrice - finalPrice,
            final_amount: finalPrice
        };

        try {
            router.post(url, payload, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    setIsSubmitting(false);
                },
                onError: (errors) => {
                    setOverlapError(Object.values(errors).join('\n'));
                    setIsSubmitting(false);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                }
            });
        } catch (error) {
            console.error('Save failed', error);
            setIsSubmitting(false);
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
                    <div className="flex-1 overflow-auto relative custom-scrollbar">
                        {calendarGrid}
                    </div>
                </Card>
            </div>

            {/* Add Booking Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl rounded-xl">
                    <DialogHeader className="bg-[#0088FF] text-white p-4 flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <PlusCircle className="h-5 w-5" />
                            Thêm đơn hàng
                        </DialogTitle>
                        <DialogDescription className="hidden">Tạo đơn hàng mới cho máy thuê</DialogDescription>
                    </DialogHeader>
                    
                    <div className="p-6 bg-[#f8fafc] space-y-5 custom-scrollbar max-h-[85vh] overflow-auto">
                        {/* Order Status Section */}
                        <div className="space-y-3 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                            <Label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" />
                                Trạng thái đơn hàng (*):
                            </Label>
                            <RadioGroup 
                                value={orderStatus} 
                                onValueChange={setOrderStatus}
                                className="flex flex-wrap gap-2"
                            >
                                <div className="flex items-center">
                                    <RadioGroupItem value="pending" id="st-pending" className="sr-only" />
                                    <Label 
                                        htmlFor="st-pending"
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all border-2",
                                            orderStatus === 'pending' 
                                                ? "bg-amber-100 border-amber-400 text-amber-700 ring-2 ring-amber-400/20" 
                                                : "bg-slate-50 border-slate-200 text-slate-400 hover:border-amber-200"
                                        )}
                                    >
                                        ⦿ Chờ giao
                                    </Label>
                                </div>
                                <div className="flex items-center">
                                    <RadioGroupItem value="renting" id="st-renting" className="sr-only" />
                                    <Label 
                                        htmlFor="st-renting"
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all border-2",
                                            orderStatus === 'renting' 
                                                ? "bg-red-500 border-red-600 text-white shadow-md ring-2 ring-red-500/20" 
                                                : "bg-slate-50 border-slate-200 text-slate-400 hover:border-red-200"
                                        )}
                                    >
                                        ⦿ Đang thuê
                                    </Label>
                                </div>
                                <div className="flex items-center">
                                    <RadioGroupItem value="finished" id="st-finished" className="sr-only" />
                                    <Label 
                                        htmlFor="st-finished"
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all border-2",
                                            orderStatus === 'finished' 
                                                ? "bg-green-600 border-green-700 text-white shadow-md ring-2 ring-green-600/20" 
                                                : "bg-slate-50 border-slate-200 text-slate-400 hover:border-green-200"
                                        )}
                                    >
                                        ⦿ Đã thuê xong
                                    </Label>
                                </div>
                                <div className="flex items-center">
                                    <RadioGroupItem value="cancelled" id="st-cancelled" className="sr-only" />
                                    <Label 
                                        htmlFor="st-cancelled"
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all border-2",
                                            orderStatus === 'cancelled' 
                                                ? "bg-emerald-100 border-emerald-300 text-emerald-700" 
                                                : "bg-slate-50 border-slate-200 text-slate-400 hover:border-emerald-200"
                                        )}
                                    >
                                        ⦿ Đã hủy
                                    </Label>
                                </div>
                                <div className="flex items-center">
                                    <RadioGroupItem value="maintenance" id="st-maintenance" className="sr-only" />
                                    <Label 
                                        htmlFor="st-maintenance"
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all border-2",
                                            orderStatus === 'maintenance' 
                                                ? "bg-slate-800 border-slate-900 text-white shadow-md" 
                                                : "bg-white border-slate-200 text-slate-400 hover:border-slate-400"
                                        )}
                                    >
                                        ⦿ Bảo trì
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            {/* Customer Info */}
                            {orderStatus !== 'maintenance' && (
                                <>
                                    <div className="col-span-4 space-y-2 relative">
                                        <Label className="text-sm font-semibold text-slate-700">Tên khách hàng (*):</Label>
                                        <div className="relative">
                                            <Input 
                                                placeholder="Nhập tên khách hàng" 
                                                className="bg-white pl-9 border-slate-200 h-11 min-h-[44px]" 
                                                value={customerSearch}
                                                onChange={(e) => handleCustomerSearch(e.target.value)}
                                                disabled={isLocked}
                                            />
                                            <UserIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                            
                                            {/* Suggestions List */}
                                            {customerSuggestions.length > 0 && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                                    {customerSuggestions.map((c) => (
                                                        <div 
                                                            key={c.id} 
                                                            className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                                            onClick={() => selectCustomer(c)}
                                                        >
                                                            <div className="font-bold text-sm text-slate-800">{c.name}</div>
                                                            <div className="text-xs text-slate-500">{c.phone || 'Không có SĐT'}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {isSearching && (
                                                <div className="absolute right-3 top-3">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-span-4 space-y-2">
                                        <Label className="text-sm font-semibold text-slate-700">Số điện thoại (*):</Label>
                                        <div className="relative">
                                            <Input 
                                                placeholder="Điện thoại" 
                                                className="w-full bg-white pl-9 border-slate-200 h-11 min-h-[44px]" 
                                                value={customerData.phone}
                                                onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                                                disabled={isLocked}
                                            />
                                            <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="col-span-4 space-y-2">
                                        <Label className="text-sm font-semibold text-slate-700">Nguồn:</Label>
                                        <Select value={source} onValueChange={setSource} disabled={isLocked}>
                                            <SelectTrigger className="w-full bg-white border-slate-200 h-11 min-h-[44px] px-3 flex justify-between items-center py-0">
                                                <SelectValue placeholder="Chọn nguồn" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="IG">Instagram (IG)</SelectItem>
                                                <SelectItem value="FB">Facebook (FB)</SelectItem>
                                                <SelectItem value="Tik Tok">Tik Tok</SelectItem>
                                                <SelectItem value="Khác">Khác</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}

                            {/* Machine Info */}
                            <div className="col-span-12 space-y-3 p-4 bg-white rounded-lg border border-slate-100 shadow-sm">
                                <div className="flex flex-wrap items-center gap-4">
                                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Camera className="h-4 w-4 text-slate-500" />
                                        Tên máy (*):
                                    </Label>
                                    <div className="flex flex-wrap gap-4">
                                        {catalogues.map(cat => (
                                            <div key={cat.id} className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`cat-${cat.id}`} 
                                                    checked={selectedCatalogues.includes(cat.id)}
                                                    onCheckedChange={() => handleCatalogueToggle(cat.id)}
                                                    disabled={isLocked}
                                                />
                                                <label htmlFor={`cat-${cat.id}`} className="text-sm font-medium leading-none cursor-pointer uppercase">{cat.name}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Select value={selectedMachineId?.toString()} onValueChange={handleMachineChange} key={selectedCatalogues.join(',')} disabled={isLocked}>
                                    <SelectTrigger className="w-full bg-white border-slate-200 h-11">
                                        <SelectValue placeholder="Chọn máy ảnh" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredMachines.map(m => (
                                            <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Rental Period */}
                            <div className="col-span-12 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-slate-500" />
                                        Thời gian thuê (*): (Buổi/Ngày -{'>'} Buổi/Ngày)
                                    </Label>
                                </div>
                                
                                <div className="space-y-2">
                                    {rentalPeriods.map((period, idx) => (
                                        <div key={idx} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                            <Select value={period.startSlot} onValueChange={(v) => updatePeriod(idx, 'startSlot', v)} disabled={isLocked}>
                                                <SelectTrigger className="w-24 bg-white border-slate-200 h-11 min-h-[44px] py-0">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {slotsList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <DatePicker 
                                                value={period.startDate} 
                                                minDate={todayString}
                                                onChange={(val) => updatePeriod(idx, 'startDate', val)}
                                                disabled={isLocked}
                                            />
                                            <span className="text-slate-400 font-bold">-{'>'}</span>
                                            <Select value={period.endSlot} onValueChange={(v) => updatePeriod(idx, 'endSlot', v)} disabled={isLocked}>
                                                <SelectTrigger className="w-24 bg-white border-slate-200 h-11 min-h-[44px] py-0">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {slotsList.map(s => (
                                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <DatePicker 
                                                value={period.endDate} 
                                                minDate={period.startDate}
                                                onChange={(val) => updatePeriod(idx, 'endDate', val)}
                                                disabled={isLocked}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {overlapError && (
                                    <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-2 rounded border border-red-100 animate-in shake duration-300">
                                        <AlertCircle className="h-3 w-3" />
                                        {overlapError}
                                    </div>
                                )}
                            </div>

                            {/* Staff Roles */}
                            <div className="col-span-12 space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Nhân viên: (💰 Chốt 📦 Giao máy 👤 Giao khách ✔ Nhận ✋ Giữ)</Label>
                                <div className="grid grid-cols-5 gap-2 overflow-hidden">
                                    {[
                                        { role: 'chot', icon: '💰' },
                                        { role: 'giao_may', icon: '📦' },
                                        { role: 'giao_khach', icon: '👤' },
                                        { role: 'nhan', icon: '✔' },
                                        { role: 'giu', icon: '✋' }
                                    ].map((item, idx) => (
                                        <div key={idx} className="min-w-0">
                                            <Select 
                                                value={staffRoles[item.role]} 
                                                onValueChange={(v) => setStaffRoles({ ...staffRoles, [item.role]: v })}
                                                disabled={item.role === 'chot' && !isSuperAdmin}
                                            >
                                                <SelectTrigger className="bg-white border-slate-200 h-11 min-h-[44px] text-[10px] px-2 w-full overflow-hidden py-0">
                                                    <SelectValue placeholder="---" className="truncate" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {item.role !== 'chot' && (
                                                        <SelectItem value="none">--- Bỏ chọn ---</SelectItem>
                                                    )}
                                                    {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pricing Section */}
                            {orderStatus !== 'maintenance' && (
                                <div className="col-span-12 p-4 bg-blue-50/50 rounded-lg border border-blue-100 shadow-inner space-y-4">
                                <div className="flex items-center justify-between">
                                    <RadioGroup 
                                        value={pricingMode} 
                                        onValueChange={(v: 'auto' | 'edit') => setPricingMode(v)} 
                                        className="flex gap-6"
                                        disabled={isLocked}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="auto" id="auto" />
                                            <Label htmlFor="auto" className="text-sm font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                                                <span className="text-blue-500">⦿</span> Nhập giá: Auto
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="edit" id="edit" />
                                            <Label htmlFor="edit" className="text-sm font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                                                🖊 Sửa
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                    
                                    <div className="text-right">
                                        <div className="flex flex-col items-end">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng tiền thuê</Label>
                                            {pricingMode === 'auto' ? (
                                                <div className="flex flex-col items-end">
                                                    <div className="text-3xl font-black text-red-600 leading-none mb-2">
                                                        {new Intl.NumberFormat('vi-VN').format(finalPrice)}đ
                                                    </div>
                                                    
                                                    {/* Price Breakdown */}
                                                    <div className="bg-white/50 border border-slate-200/50 rounded-lg p-2 space-y-1 w-full max-w-[200px] shadow-sm">
                                                        <div className="flex justify-between text-[10px] text-slate-500">
                                                            <span>Tạm tính:</span>
                                                            <span className="font-medium">{new Intl.NumberFormat('vi-VN').format(Math.round(basePrice))}đ</span>
                                                        </div>
                                                        {selectedCustomer?.discount_percent > 0 && (
                                                            <div className="flex justify-between text-[10px] text-green-600 font-bold">
                                                                <span>CK khách ({selectedCustomer.discount_percent}%):</span>
                                                                <span>-{new Intl.NumberFormat('vi-VN').format(Math.round(basePrice - calculatedPrice))}đ</span>
                                                            </div>
                                                        )}
                                                        {applyPromotion && promotionAmount > 0 && (
                                                            <div className="flex justify-between text-[10px] text-blue-600 font-bold border-t border-slate-100 pt-1">
                                                                <span>Khuyến mãi thêm:</span>
                                                                <span>
                                                                    -{new Intl.NumberFormat('vi-VN').format(Math.round(calculatedPrice - finalPrice))}đ
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <PriceInput 
                                                    value={manualPrice} 
                                                    onValueChange={(v) => setManualPrice(v)}
                                                    className="text-right text-xl font-black text-red-600 bg-white border-red-200 w-44 h-10 shadow-sm"
                                                    placeholder="Nhập giá..."
                                                    disabled={isLocked}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between bg-slate-50/50 p-2 rounded-lg border border-dashed border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <Checkbox 
                                                id="apply-promo" 
                                                checked={applyPromotion} 
                                                onCheckedChange={(v) => setApplyPromotion(!!v)} 
                                                className="data-[state=checked]:bg-blue-600"
                                                disabled={isLocked}
                                            />
                                            <Label htmlFor="apply-promo" className="text-sm font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                                                <BadgePercent className="h-4 w-4 text-blue-500" />
                                                Áp dụng khuyến mãi thêm
                                            </Label>
                                        </div>
                                        
                                        {applyPromotion && (
                                            <ToggleGroup 
                                                type="single" 
                                                value={promotionMode} 
                                                onValueChange={(v) => v && setPromotionMode(v as 'money' | 'percent')}
                                                className="bg-white border rounded-md shadow-sm p-0.5 h-8"
                                            >
                                                <ToggleGroupItem 
                                                    value="money" 
                                                    className="h-7 px-3 text-[11px] font-bold data-[state=on]:bg-blue-600 data-[state=on]:text-white transition-all"
                                                >
                                                    VNĐ
                                                </ToggleGroupItem>
                                                <ToggleGroupItem 
                                                    value="percent" 
                                                    className="h-7 px-3 text-[11px] font-bold data-[state=on]:bg-blue-600 data-[state=on]:text-white transition-all"
                                                >
                                                    %
                                                </ToggleGroupItem>
                                            </ToggleGroup>
                                        )}
                                    </div>

                                    {applyPromotion && (
                                        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Mức giảm</Label>
                                                {promotionMode === 'money' ? (
                                                    <PriceInput 
                                                        placeholder="Nhập số tiền..." 
                                                        value={promotionAmount}
                                                        onValueChange={setPromotionAmount}
                                                        className="bg-white border-slate-200 h-10 shadow-sm focus:border-blue-400" 
                                                    />
                                                ) : (
                                                    <div className="relative">
                                                        <Input 
                                                            type="number" 
                                                            placeholder="Nhập %..." 
                                                            value={promotionAmount}
                                                            onChange={(e) => setPromotionAmount(Number(e.target.value))}
                                                            className="bg-white border-slate-200 h-10 pr-8 shadow-sm focus:border-blue-400" 
                                                            disabled={isLocked}
                                                        />
                                                        <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Lý do</Label>
                                                <Input 
                                                    placeholder="Ghi chú lý do..." 
                                                    value={promotionReason}
                                                    onChange={(e) => setPromotionReason(e.target.value)}
                                                    className="bg-white border-slate-200 h-10 shadow-sm focus:border-blue-400" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            )}

                            {/* Deposit & Notes */}
                            <div className="col-span-12 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Wallet className="h-4 w-4 text-slate-500" />
                                        Thông tin cọc:
                                    </Label>
                                    <Input 
                                        placeholder="Mô tả thông tin cọc" 
                                        value={depositInfo}
                                        onChange={(e) => setDepositInfo(e.target.value)}
                                        className="bg-white border-slate-200 h-11" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <NotebookPen className="h-4 w-4 text-slate-500" />
                                        Ghi chú:
                                    </Label>
                                    <Textarea 
                                        placeholder="Ghi chú thêm..." 
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="bg-white border-slate-200 min-h-[80px]" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button 
                                className="flex-1 bg-[#0088FF] hover:bg-blue-600 h-12 text-base font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isSubmitting || !!overlapError || !selectedMachineId || rentalPeriods.length === 0}
                                onClick={handleSaveBooking}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center gap-2 justify-center">
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {editingOrderId ? 'Đang cập nhật...' : 'Đang tạo...'}
                                    </div>
                                ) : (
                                    editingOrderId ? 'Cập nhật đơn hàng' : 'Tạo đơn hàng'
                                )}
                            </Button>
                            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 text-base font-bold border-slate-200">
                                Hủy bỏ
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            
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
    
    return (
        <table 
            className="w-full border-collapse table-fixed border-spacing-0"
            style={{ minWidth: `${totalMinWidth}px` }}
        >
            <colgroup>
                <col style={{ width: '200px' }} />
                {days.flatMap((_: any, dIdx: number) => 
                    slots.map((_: any, sIdx: number) => (
                        <col key={`${dIdx}-${sIdx}`} style={{ width: '32px' }} />
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
                        <th key={idx} colSpan={slots.length} className={`border-r border-b p-1 text-center h-16 ${isSameDay(day, new Date()) ? 'bg-blue-50' : ''}`}>
                            <div className="text-sm font-bold text-slate-700">{format(day, 'dd', { locale: vi })}</div>
                            <div className="text-[10px] uppercase text-slate-500">{format(day, 'EEEE', { locale: vi })}</div>
                        </th>
                    ))}
                </tr>
                <tr className="bg-slate-50">
                    <th className="sticky left-0 z-30 bg-slate-50 border-r border-b shadow-[2px_0_5px_rgba(0,0,0,0.05)] h-8"></th>
                    {days.map((day: any, dIdx: number) => (
                        <React.Fragment key={dIdx}>
                            {slots.map((slot: any, sIdx: number) => (
                                <th 
                                    key={`${dIdx}-${sIdx}`} 
                                    style={{ width: '32px', minWidth: '32px' }}
                                    className="border-r border-b text-[10px] font-bold text-slate-400 h-8"
                                >
                                    {slot}
                                </th>
                            ))}
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
                                    const isPast = day < new Date() && !isSameDay(day, new Date());
                                    const booking = findBooking(machine.id, day, slot);
                                    let cellColor = '#4ade80';
                                    let isClickable = true;
                                    let tooltip = `${machine.name} - ${format(day, 'dd/MM')} - Buổi ${slot}`;
                                    
                                    if (booking) {
                                        if (booking.status === 'maintenance') {
                                            cellColor = '#ffffff';
                                            isClickable = true;
                                            tooltip = 'Bảo trì';
                                        } else if (isPast) {
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

                                    if (showPopover) {
                                        return (
                                            <td key={`${dIdx}-${sIdx}`} title={tooltip} className="border-r border-b p-0 cursor-pointer">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        {innerBlock({ onDoubleClick: () => onCellDoubleClick(machine.id, day, slot) })}
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-72 p-0 shadow-2xl border border-amber-200 rounded-xl bg-[#fffbeb] overflow-hidden" side="top" align="center">
                                                        <BookingInfoPopover booking={booking} machineName={machine.name} users={users} />
                                                    </PopoverContent>
                                                </Popover>
                                            </td>
                                        );
                                    }

                                    return (
                                        <td
                                            key={`${dIdx}-${sIdx}`}
                                            title={tooltip}
                                            className={cn("border-r border-b p-0", (isClickable || booking) ? "cursor-pointer" : "cursor-not-allowed opacity-50")}
                                            onDoubleClick={() => { if (hasPermission && (isClickable || booking)) onCellDoubleClick(machine.id, day, slot); }}
                                        >
                                            {innerBlock()}
                                        </td>
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
