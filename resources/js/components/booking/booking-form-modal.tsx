import React, { useMemo, useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Product, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, User as UserIcon, Phone, Camera, Clock, BadgePercent, Wallet, NotebookPen, PlusCircle, AlertCircle } from 'lucide-react';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay, isBefore, startOfDay } from 'date-fns';
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

interface BookingFormModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    machines: Product[];
    users: User[];
    catalogues: any[];
    bookings: any[];
    initialSlot?: { machineId: number, date: string, slot: string } | null;
    editingOrder?: any;
    onSuccess?: () => void;
}

const DatePicker = ({ value, onChange, minDate, disabled }: { value: string, onChange: (val: string) => void, minDate?: string, disabled?: boolean }) => {
    const date = value ? new Date(value) : undefined;
    const min = minDate ? new Date(minDate) : undefined;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    disabled={disabled}
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

export function BookingFormModal({ 
    isOpen, 
    onOpenChange, 
    machines, 
    users, 
    catalogues, 
    bookings,
    initialSlot,
    editingOrder,
    onSuccess
}: BookingFormModalProps) {
    const { auth } = usePage().props as any;
    const currentUser = auth.user;
    const isSuperAdmin = currentUser?.id === 1;

    // Booking Form State
    const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
    const [rentalPeriods, setRentalPeriods] = useState<{ startSlot: string, startDate: string, endSlot: string, endDate: string }[]>([]);
    const [pricingMode, setPricingMode] = useState<'auto' | 'edit'>('auto');
    const [manualPrice, setManualPrice] = useState<number | string>('');
    const [applyPromotion, setApplyPromotion] = useState(false);
    const [promotionMode, setPromotionMode] = useState<'money' | 'percent'>('money');
    const [promotionAmount, setPromotionAmount] = useState<number | string>('');
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
    const [selectedCatalogues, setSelectedCatalogues] = useState<number[]>([]);

    const slotsList = ['S', 'C', 'T'];

    // Handle initial state and updates
    useEffect(() => {
        if (!isOpen) return;

        if (editingOrder) {
            handleLoadOrder(editingOrder, editingOrder.bookings?.[0]?.product_id || 0);
        } else if (initialSlot) {
            // New booking from slot
            setEditingOrderId(null);
            setSelectedMachineId(initialSlot.machineId);
            setRentalPeriods([{ 
                startSlot: initialSlot.slot, 
                startDate: initialSlot.date, 
                endSlot: initialSlot.slot, 
                endDate: initialSlot.date 
            }]);
            
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
            setManualPrice('');
            setApplyPromotion(false);
            setPromotionAmount('');
            setPromotionReason('');
            setOverlapError(null);

            const machine = machines.find(m => m.id === initialSlot.machineId);
            if (machine) setDepositInfo(machine.deposit || '');
        } else {
            // Default new booking
            resetForm();
        }
    }, [isOpen, editingOrder, initialSlot]);

    const resetForm = () => {
        setEditingOrderId(null);
        setSelectedMachineId(null);
        setRentalPeriods([]);
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
        setManualPrice('');
        setApplyPromotion(false);
        setPromotionAmount('');
        setPromotionReason('');
        setOverlapError(null);
        setDepositInfo('');
    };

    const handleLoadOrder = (order: any, machineId: number) => {
        if (!order) return;

        setEditingOrderId(order.id);
        setSelectedMachineId(machineId);
        setCustomerSearch(order.customer_name);
        setCustomerData({ name: order.customer_name, phone: order.customer_phone });
        
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

        const orderSlots = order.bookings || [];
        if (orderSlots.length > 0) {
            const sorted = [...orderSlots].sort((a, b) => {
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
        
        if (Number(order.promotion_value) > 0) {
            setApplyPromotion(true);
            setPromotionMode(order.promotion_type as 'money' | 'percent' || 'money');
            setPromotionAmount(Number(order.promotion_value));
            setPromotionReason(order.discount_reason || '');
        } else {
            setApplyPromotion(false);
            setPromotionAmount('');
            setPromotionReason('');
        }

        setPricingMode('edit');
        setManualPrice(Number(order.final_amount));
        setOverlapError(null);
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

    const getSlotValue = (date: string, slot: string) => {
        const [y, m, d] = date.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        dt.setHours(0, 0, 0, 0);
        const time = Math.floor(dt.getTime() / (1000 * 60 * 60 * 24));
        const offset = slotsList.indexOf(slot);
        return time * 3 + offset;
    };

    const countSessionsInPeriod = (startSlot: string, startDate: string, endSlot: string, endDate: string) => {
        const startVal = getSlotValue(startDate, startSlot);
        const endVal = getSlotValue(endDate, endSlot);
        return Math.max(0, endVal - startVal + 1);
    };

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
            for (let i = start; i <= end; i++) allSlots.add(i);
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
            if (sessions === 1) total += p6h;
            else if (sessions === 2) total += p1d;
            else {
                const days = sessions / 3;
                const rate = sessions >= 9 ? p3d : p1d;
                total += days * rate;
            }
        });
        return total;
    }, [totalSessions, selectedMachine, rentalPeriods]);

    const calculatedPrice = useMemo(() => {
        let price = basePrice;
        const customerDiscountPercent = selectedCustomer?.discount_percent || 0;
        if (customerDiscountPercent > 0) price = price * (1 - customerDiscountPercent / 100);
        return Math.round(price);
    }, [basePrice, selectedCustomer]);

    const finalPrice = useMemo(() => {
        if (pricingMode === 'edit') return manualPrice || 0;
        let price = calculatedPrice;
        if (applyPromotion) {
            if (promotionMode === 'money') price = Math.max(0, price - (promotionAmount || 0));
            else price = Math.max(0, price - (basePrice * (promotionAmount || 0) / 100));
        }
        return Math.round(price);
    }, [calculatedPrice, basePrice, applyPromotion, promotionMode, promotionAmount, pricingMode, manualPrice]);

    const validateOverlap = (periods: any[]) => {
        setOverlapError(null);
        if (selectedMachineId) {
            for (const p of periods) {
                const pStart = getSlotValue(p.startDate, p.startSlot);
                const pEnd = getSlotValue(p.endDate, p.endSlot);

                const conflicts = (bookings || []).filter(b => {
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
        if (selectedMachineId && rentalPeriods.length > 0) {
            validateOverlap(rentalPeriods);
        }
    }, [rentalPeriods, selectedMachineId, bookings, editingOrderId]);

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
        const url = editingOrderId ? `/backend/booking/update/${editingOrderId}` : '/backend/booking/store';
        const payload = {
            product_id: selectedMachineId,
            customer_name: customerData.name,
            customer_phone: customerData.phone,
            customer_discount_percent: selectedCustomer?.discount_percent || 0,
            customer_id: selectedCustomer?.id || null,
            source,
            status: orderStatus,
            rental_periods: rentalPeriods,
            pricing_mode: pricingMode,
            manual_price: manualPrice,
            apply_promotion: applyPromotion,
            promotion_mode: promotionMode,
            promotion_amount: promotionAmount,
            promotion_reason: promotionReason,
            deposit_info: depositInfo,
            notes,
            staff_roles: staffRoles,
            total_amount: basePrice,
            discount_amount: basePrice - finalPrice,
            final_amount: finalPrice
        };

        try {
            router.post(url, payload, {
                onSuccess: () => {
                    setIsSubmitting(false);
                    onOpenChange(false);
                    if (onSuccess) onSuccess();
                },
                onError: (errors) => {
                    setOverlapError(Object.values(errors).join('\n'));
                    setIsSubmitting(false);
                },
                onFinish: () => setIsSubmitting(false)
            });
        } catch (error) {
            console.error('Save failed', error);
            setIsSubmitting(false);
        }
    };

    const isLocked = editingOrderId !== null && orderStatus !== 'pending';
    const filteredMachines = useMemo(() => {
        if (selectedCatalogues.length === 0) return machines;
        return machines.filter(m => m.product_catalogues.some((cat: any) => selectedCatalogues.includes(cat.id)));
    }, [machines, selectedCatalogues]);

    const handleCatalogueToggle = (id: number) => {
        setSelectedCatalogues(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const updatePeriod = (index: number, field: string, value: string) => {
        const newPeriods = [...rentalPeriods];
        const updated = { ...newPeriods[index], [field]: value };
        if (field === 'startDate') {
            const start = new Date(value);
            const end = new Date(updated.endDate);
            if (end < start) updated.endDate = value;
        }
        newPeriods[index] = updated;
        setRentalPeriods(newPeriods);
    };

    const todayString = format(new Date(), 'yyyy-MM-dd');

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl rounded-xl">
                <DialogHeader className="bg-[#0088FF] text-white p-4 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <PlusCircle className="h-5 w-5" />
                        {editingOrderId ? 'Cập nhật đơn hàng' : 'Thêm đơn hàng'}
                    </DialogTitle>
                    <DialogDescription className="hidden">Tạo hoặc cập nhật đơn hàng cho máy thuê</DialogDescription>
                </DialogHeader>
                
                <div className="p-6 bg-[#f8fafc] space-y-5 custom-scrollbar max-h-[85vh] overflow-auto">
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
                        {orderStatus !== 'maintenance' && (
                            <>
                                <div className="col-span-4 space-y-2 relative">
                                    <Label className="text-sm font-semibold text-slate-700">Tên khách hàng (*):</Label>
                                    <div className="relative">
                                        <Input 
                                            placeholder="Nhập tên khách hàng" 
                                            className="bg-white pl-9 border-slate-200 h-11" 
                                            value={customerSearch}
                                            onChange={(e) => handleCustomerSearch(e.target.value)}
                                            disabled={isLocked}
                                        />
                                        <UserIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        {customerSuggestions.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                                {customerSuggestions.map((c) => (
                                                    <div key={c.id} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100" onClick={() => selectCustomer(c)}>
                                                        <div className="font-bold text-sm text-slate-800">{c.name}</div>
                                                        <div className="text-xs text-slate-500">{c.phone || 'Không có SĐT'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-4 space-y-2">
                                    <Label className="text-sm font-semibold text-slate-700">Số điện thoại (*):</Label>
                                    <div className="relative">
                                        <Input 
                                            placeholder="Điện thoại" 
                                            className="w-full bg-white pl-9 border-slate-200 h-11" 
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
                                        <SelectTrigger className="w-full bg-white border-slate-200 h-11 px-3">
                                            <SelectValue placeholder="Chọn nguồn" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['IG', 'FB', 'Tik Tok', 'Khác'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        <div className="col-span-12 space-y-3 p-4 bg-white rounded-lg border border-slate-100 shadow-sm">
                            <div className="flex flex-wrap items-center gap-4">
                                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Camera className="h-4 w-4 text-slate-500" /> Tên máy (*):
                                </Label>
                                <div className="flex flex-wrap gap-4">
                                    {catalogues.map(cat => (
                                        <div key={cat.id} className="flex items-center space-x-2">
                                            <Checkbox id={`cat-${cat.id}`} checked={selectedCatalogues.includes(cat.id)} onCheckedChange={() => handleCatalogueToggle(cat.id)} disabled={isLocked} />
                                            <label htmlFor={`cat-${cat.id}`} className="text-sm font-medium leading-none cursor-pointer uppercase">{cat.name}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Select value={selectedMachineId?.toString()} onValueChange={(v) => setSelectedMachineId(Number(v))} disabled={isLocked}>
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

                        <div className="col-span-12 space-y-3">
                            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-500" /> Thời gian thuê (*):
                            </Label>
                            <div className="space-y-2">
                                {rentalPeriods.map((period, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <Select value={period.startSlot} onValueChange={(v) => updatePeriod(idx, 'startSlot', v)} disabled={isLocked}>
                                            <SelectTrigger className="w-24 bg-white border-slate-200 h-11 min-h-[44px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>{slotsList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <DatePicker value={period.startDate} minDate={todayString} onChange={(val) => updatePeriod(idx, 'startDate', val)} disabled={isLocked} />
                                        <span className="text-slate-400 font-bold">-&gt;</span>
                                        <Select value={period.endSlot} onValueChange={(v) => updatePeriod(idx, 'endSlot', v)} disabled={isLocked}>
                                            <SelectTrigger className="w-24 bg-white border-slate-200 h-11 min-h-[44px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>{slotsList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <DatePicker value={period.endDate} minDate={period.startDate} onChange={(val) => updatePeriod(idx, 'endDate', val)} disabled={isLocked} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="col-span-12 space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                Nhân viên: (<span className="inline-flex items-center gap-1 mx-1">💰 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Chốt</span></span>
                                <span className="inline-flex items-center gap-1 mx-1">📦 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Giao máy</span></span>
                                <span className="inline-flex items-center gap-1 mx-1">👤 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Giao khách</span></span>
                                <span className="inline-flex items-center gap-1 mx-1">✔️ <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Nhận</span></span>
                                <span className="inline-flex items-center gap-1 mx-1">✋ <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Giữ</span>)</span>
                            </Label>
                            <div className="grid grid-cols-5 gap-2">
                                {[
                                    { role: 'chot', icon: '💰' },
                                    { role: 'giao_may', icon: '📦' },
                                    { role: 'giao_khach', icon: '👤' },
                                    { role: 'nhan', icon: '✔' },
                                    { role: 'giu', icon: '✋' }
                                ].map((item) => (
                                    <div key={item.role} className="flex flex-col gap-1">
                                        <Select value={staffRoles[item.role]} onValueChange={(v) => setStaffRoles({ ...staffRoles, [item.role]: v })} disabled={item.role === 'chot' && !isSuperAdmin}>
                                            <SelectTrigger className="bg-white border-slate-200 h-11 min-h-[44px] text-[10px] px-2 w-full overflow-hidden py-0">
                                                <SelectValue placeholder="---" className="truncate" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {item.role !== 'chot' && <SelectItem value="none">--- Bỏ chọn ---</SelectItem>}
                                                {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </div>

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
                                                    <div className="bg-white/50 border border-slate-200/50 rounded-lg p-2 space-y-1 w-full max-w-[200px] shadow-sm text-left">
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
                                                        {applyPromotion && Number(promotionAmount) > 0 && (
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
                                                    value={manualPrice || ''} 
                                                    onValueChange={(v) => setManualPrice(v || '')}
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
                                                        value={promotionAmount || ''}
                                                        onValueChange={(val) => setPromotionAmount(val || '')}
                                                        className="bg-white border-slate-200 h-10 shadow-sm focus:border-blue-400" 
                                                    />
                                                ) : (
                                                    <div className="relative">
                                                        <Input 
                                                            type="number" 
                                                            placeholder="Nhập %..." 
                                                            value={promotionAmount || ''}
                                                            onChange={(e) => setPromotionAmount(e.target.value === '' ? '' : Number(e.target.value))}
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

                        <div className="col-span-12 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Thông tin cọc:</Label>
                                <Input placeholder="Mô tả thông tin cọc" value={depositInfo} onChange={(e) => setDepositInfo(e.target.value)} className="bg-white border-slate-200 h-11" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Ghi chú:</Label>
                                <Textarea placeholder="Ghi chú thêm..." value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-white border-slate-200" />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button className="flex-1 bg-[#0088FF] h-12 text-base font-bold shadow-lg" disabled={isSubmitting || !!overlapError || !selectedMachineId || rentalPeriods.length === 0} onClick={handleSaveBooking}>
                            {isSubmitting ? 'Đang lưu...' : editingOrderId ? 'Cập nhật đơn hàng' : 'Tạo đơn hàng'}
                        </Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12 text-base font-bold border-slate-200">
                            Hủy bỏ
                        </Button>
                    </div>
                </div>
            </DialogContent>
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
            `}} />
        </Dialog>
    );
}
