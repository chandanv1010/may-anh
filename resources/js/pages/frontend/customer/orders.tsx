import React, { useState, useMemo } from 'react';
import CustomerLayout from '@/layouts/customer-layout';
import { Head, router } from '@inertiajs/react';
import { 
    Clock, Package, Truck, CheckCircle2, XCircle, 
    AlertCircle, Eye, Trash2, ChevronRight, 
    MapPin, CreditCard, Calendar, Box, ShoppingBag,
    Search, Filter, Gift, Info, Receipt, TruckIcon,
    ArrowRight, Printer, Download, X, Layers
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
    Dialog, DialogContent, DialogHeader, 
    DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ProductImage } from '@/components/product-image';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface OrderItem {
    id: number;
    product_name: string;
    variant_name: string;
    quantity: number;
    price: string | number;
    original_price: string | number;
    total: string | number;
    type: string;
    combo_group_id?: string;
    is_gift: boolean | number;
    promo_id: number | null;
    product?: {
        image?: string;
    };
    variant?: {
        album?: string[];
        image?: string;
    };
    promotions_snapshot?: any;
}

interface Order {
    id: number;
    order_code: string;
    order_status: string;
    payment_status: string;
    total_amount: string | number;
    subtotal: string | number;
    discount_total: string | number;
    voucher_discount: string | number;
    shipping_fee: string | number;
    created_at: string;
    order_items: OrderItem[];
    payment_method?: {
        name: string;
    };
    shipping_address?: string;
    customer_name?: string;
    customer_phone?: string;
    notes?: string;
    summary_snapshot?: any;
}

interface OrdersProps {
    orders: Order[];
}

const ORDER_STATUSES = {
    all: { label: 'Tất cả đơn', color: 'bg-zinc-100 text-zinc-600', icon: Box },
    pending: { label: 'Chờ xử lý', color: 'bg-orange-500 text-white', icon: Clock },
    processing: { label: 'Đang xử lý', color: 'bg-blue-500 text-white', icon: Package },
    shipping: { label: 'Đang giao', color: 'bg-indigo-500 text-white', icon: TruckIcon },
    completed: { label: 'Hoàn thành', color: 'bg-green-600 text-white', icon: CheckCircle2 },
    cancelled: { label: 'Đã hủy', color: 'bg-red-500 text-white', icon: XCircle },
};

const PAYMENT_STATUSES = {
    unpaid: { label: 'Chưa thanh toán', color: 'bg-slate-400 text-white' },
    paid: { label: 'Đã thanh toán', color: 'bg-green-600 text-white' },
};

const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
};

export default function Orders({ orders }: OrdersProps) {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('all');

    const handleViewDetail = (order: Order) => {
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
    };

    const filteredOrders = useMemo(() => {
        let filtered = orders;
        if (activeTab !== 'all') filtered = filtered.filter(order => order.order_status === activeTab);
        if (paymentFilter !== 'all') filtered = filtered.filter(order => order.payment_status === paymentFilter);
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(order => 
                order.order_code.toLowerCase().includes(query) ||
                order.order_items.some(item => item.product_name.toLowerCase().includes(query))
            );
        }
        return filtered;
    }, [orders, activeTab, paymentFilter, searchQuery]);

    const FilterToolbar = (
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center w-full max-w-7xl mx-auto">
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#1C8EB8] transition-colors" size={18} />
                <Input 
                    placeholder="Tìm nhanh theo mã đơn..." 
                    className="h-12 pl-12 pr-4 bg-white border-zinc-200 rounded-xl text-sm font-bold shadow-sm focus:border-[#1C8EB8] transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-4">
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="w-full sm:w-[240px] h-12 bg-white border-zinc-200 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-sm">
                        <SelectValue placeholder="Trạng thái thanh toán" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-zinc-100 p-1">
                        <SelectItem value="all" className="font-black uppercase text-[10px] py-3 rounded-lg text-slate-900">Tất cả thanh toán</SelectItem>
                        <SelectItem value="paid" className="font-black uppercase text-[10px] py-3 rounded-lg text-green-600">Đã thanh toán</SelectItem>
                        <SelectItem value="unpaid" className="font-black uppercase text-[10px] py-3 rounded-lg text-slate-600">Chưa thanh toán</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    return (
        <CustomerLayout title="Đơn hàng" extraHeader={FilterToolbar}>
            <Head title="Quản lý đơn hàng" />
            <div className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="overflow-x-auto pb-4 scrollbar-hide border-b border-zinc-100">
                        <TabsList className="bg-zinc-100/60 p-1.5 rounded-2xl inline-flex w-auto min-w-full gap-1.5">
                            {Object.entries(ORDER_STATUSES).map(([key, config]) => (
                                <TabsTrigger 
                                    key={key}
                                    value={key} 
                                    className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-wider data-[state=active]:bg-[#1C8EB8] data-[state=active]:text-white transition-all rounded-xl whitespace-nowrap border-none"
                                >
                                    <config.icon size={14} />
                                    <span>{config.label}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="mt-8 space-y-6 animate-in fade-in duration-500">
                        {filteredOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-zinc-50/20 rounded-3xl border border-dashed border-zinc-200">
                                <ShoppingBag size={40} className="text-zinc-200 mb-2" />
                                <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest">Không có dữ liệu</p>
                            </div>
                        ) : (
                            filteredOrders.map((order) => (
                                <OrderCard 
                                    key={order.id} 
                                    order={order} 
                                    onViewDetail={() => handleViewDetail(order)}
                                    onCancel={() => {
                                        setSelectedOrder(order);
                                        setIsCancelModalOpen(true);
                                    }}
                                />
                            ))
                        )}
                    </div>
                </Tabs>
            </div>

            <OrderDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} order={selectedOrder} />

            <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
                <DialogContent className="sm:max-w-[400px] rounded-[32px] p-8 overflow-hidden border border-zinc-100 shadow-2xl">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl shadow-red-100">
                            <AlertCircle className="text-white" size={32} />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-800 mb-3">Xác nhận hủy đơn</DialogTitle>
                        <p className="text-sm font-bold text-slate-500 mb-8">Bạn có chắc chắn muốn hủy đơn hàng #{selectedOrder?.order_code}?</p>
                        <div className="flex gap-4">
                            <Button variant="ghost" onClick={() => setIsCancelModalOpen(false)} disabled={loading} className="flex-1 font-black h-12 rounded-xl text-[#1C8EB8]">Quay lại</Button>
                            <Button variant="destructive" 
                                onClick={() => {
                                    if (!selectedOrder) return;
                                    setLoading(true);
                                    router.post(`/customer/orders/${selectedOrder.id}/cancel`, {}, {
                                        onSuccess: () => {
                                            toast.success('Hủy đơn hàng thành công');
                                            setIsCancelModalOpen(false);
                                            setLoading(false);
                                        },
                                        onError: () => setLoading(false)
                                    });
                                }} 
                                disabled={loading} 
                                className="flex-1 font-black h-12 rounded-xl bg-red-600"
                            >
                                {loading ? 'Đang xử lý...' : 'Đồng ý'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </CustomerLayout>
    );
}

function OrderCard({ order, onViewDetail, onCancel }: { order: Order, onViewDetail: () => void, onCancel: () => void }) {
    const status = ORDER_STATUSES[order.order_status as keyof typeof ORDER_STATUSES] || ORDER_STATUSES.pending;
    const payStatus = PAYMENT_STATUSES[order.payment_status as keyof typeof PAYMENT_STATUSES] || PAYMENT_STATUSES.unpaid;

    return (
        <div className="group relative bg-white border border-zinc-200 rounded-[32px] overflow-hidden hover:shadow-2xl hover:border-[#1C8EB8]/30 transition-all duration-300">
            <div className="p-8 md:p-10 space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-8 border-b border-zinc-100 pb-8">
                    <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-2xl shadow-lg flex items-center justify-center ${status.color}`}>
                            <status.icon size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Mã giao dịch</span>
                                <h4 className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums leading-none group-hover:text-[#1C8EB8] transition-colors">#{order.order_code}</h4>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="text-[11px] font-bold text-slate-600 leading-none tabular-nums">
                                    {format(new Date(order.created_at), 'HH:mm • dd/MM/yyyy', { locale: vi })}
                                </p>
                                <div className="h-1 w-1 rounded-full bg-slate-400" />
                                <span className="text-[10px] font-black uppercase text-[#1C8EB8] tracking-widest leading-none">{status.label}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Giá trị đơn hàng</span>
                        <p className="text-3xl font-black text-[#1C8EB8] tracking-tighter tabular-nums leading-none">{formatCurrency(order.total_amount)}</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center gap-10">
                    <div className="flex flex-wrap gap-3 shrink-0">
                        {order.order_items.slice(0, 4).map((item, idx) => (
                            <div key={item.id} className="relative h-20 w-20 rounded-2xl border border-zinc-200 overflow-hidden bg-white shadow-xl transition-all hover:scale-110 hover:border-[#1C8EB8] z-10 hover:z-20">
                                <ProductImage src={item.product?.image || item.variant?.album?.[0] || ''} alt={item.product_name} className="h-full w-full object-cover" />
                            </div>
                        ))}
                        {order.order_items.length > 4 && (
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-950 text-[11px] font-black text-white shadow-xl z-10">+{order.order_items.length - 4}</div>
                        )}
                    </div>
                    <div className="flex-1 space-y-6">
                        <div>
                            <h5 className="text-[15px] font-black text-slate-900 leading-tight mb-3 line-clamp-1 uppercase tracking-tight">
                                {order.order_items[0].product_name}
                                {order.order_items.length > 1 && <span className="text-[#1C8EB8] ml-2 opacity-80">& {order.order_items.length - 1} sản phẩm khác</span>}
                            </h5>
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-2 text-[11px] font-black text-slate-700 uppercase tracking-tight leading-none">
                                    <div className="h-6 w-6 rounded-lg bg-zinc-100 flex items-center justify-center"><CreditCard size={14} /></div>
                                    {order.payment_method?.name}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none">
                                    <div className={`h-6 w-6 rounded-lg flex items-center justify-center shadow-md ${payStatus.color}`}><CheckCircle2 size={14} /></div>
                                    {payStatus.label}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-zinc-100/50 p-4 rounded-xl border border-zinc-100">
                            <MapPin size={14} className="text-[#1C8EB8]" />
                            <span className="text-[11px] font-bold text-slate-700 line-clamp-1 italic">{order.shipping_address || 'Địa chỉ nhận hàng mặc định'}</span>
                        </div>
                    </div>
                    <div className="lg:ml-auto flex items-center gap-4 w-full lg:w-auto mt-6 lg:mt-0">
                        {order.order_status === 'pending' && (
                            <Button variant="ghost" onClick={onCancel} className="h-14 px-8 text-red-600 hover:text-red-700 font-black text-[12px] uppercase rounded-2xl">Hủy đơn</Button>
                        )}
                        <Button onClick={onViewDetail} className="flex-1 lg:flex-none h-14 px-10 bg-zinc-950 hover:bg-[#1C8EB8] text-white font-black text-[12px] uppercase tracking-[0.2em] rounded-2xl shadow-xl flex items-center justify-center gap-4 transition-all">
                            Quản lý dữ liệu <ArrowRight size={18} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function OrderDetailModal({ isOpen, onClose, order }: { isOpen: boolean, onClose: () => void, order: Order | null }) {
    if (!order) return null;
    
    const status = ORDER_STATUSES[order.order_status as keyof typeof ORDER_STATUSES] || ORDER_STATUSES.pending;
    const payStatus = PAYMENT_STATUSES[order.payment_status as keyof typeof PAYMENT_STATUSES] || PAYMENT_STATUSES.unpaid;

    const groupedItems = useMemo(() => {
        const result: any[] = [];
        const combos: Record<string, any> = {};

        order.order_items.forEach(item => {
            const isActuallyFree = Number(item.price) === 0;

            if (item.type === 'combo_item' && item.combo_group_id) {
                const gid = item.combo_group_id;
                if (!combos[gid]) {
                    const comboInfo = item.promotions_snapshot?.combo_snapshot || {};
                    combos[gid] = {
                        id: `combo-${gid}`,
                        is_combo: true,
                        combo_group_id: gid,
                        name: comboInfo.combo_name || 'Gói sản phẩm Combo',
                        image: comboInfo.combo_image || null,
                        items: [],
                        total: 0
                    };
                    result.push(combos[gid]);
                }
                combos[gid].items.push(item);
                combos[gid].total += Number(item.total);
            } else if (isActuallyFree) {
                result.push({ ...item, is_reward: true });
            } else {
                result.push({ ...item, is_standard: true });
            }
        });

        return result;
    }, [order.order_items]);

    const { displayedSubtotal, displayedDiscount } = useMemo(() => {
        const subtotal = groupedItems.reduce((sum, group) => sum + Number(group.total || 0), 0);
        const discount = subtotal + Number(order.shipping_fee) - Number(order.total_amount);
        return { displayedSubtotal: subtotal, displayedDiscount: discount };
    }, [groupedItems, order.total_amount, order.shipping_fee]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="wide-modal p-0 rounded-[24px] border border-zinc-200 shadow-3xl overflow-hidden bg-white max-h-[94vh] flex flex-col">
                <div className="bg-white px-10 py-8 border-b border-zinc-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-6">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg ${status.color}`}>
                            <status.icon size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-0.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#1C8EB8]">Thông tin giao dịch chi tiết</span>
                                <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-[9px] font-black border-zinc-300 text-zinc-900`}>
                                    {status.label}
                                </Badge>
                                <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-[9px] font-black border-zinc-300 text-zinc-900`}>
                                    {payStatus.label}
                                </Badge>
                            </div>
                            <h2 className="text-3xl font-black tracking-tighter text-zinc-900 uppercase">#{order.order_code}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" className="h-10 px-6 rounded-xl text-xs font-black gap-2 border-zinc-200 hover:bg-zinc-50 transition-colors"><Printer size={14} /> In hóa đơn</Button>
                        <Button size="icon" onClick={onClose} className="h-10 w-10 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 rounded-xl ml-2 shadow-none"><X size={20} /></Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-white">
                    <div className="p-10 space-y-10 max-w-[1400px] mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="bg-white p-8 rounded-3xl border border-zinc-100 space-y-5">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900">
                                    <MapPin size={16} className="text-[#1C8EB8]" /> Thông tin nhận hàng
                                </h4>
                                <div className="space-y-1">
                                    <p className="text-lg font-black text-zinc-900 leading-none">{order.customer_name || 'Khách hàng'}</p>
                                    <p className="text-xs font-bold text-zinc-600 tabular-nums">{order.customer_phone}</p>
                                </div>
                                <div className="p-5 bg-zinc-50 rounded-2xl text-[13px] font-bold text-zinc-900 leading-relaxed tabular-nums border border-zinc-100 italic">
                                    {order.shipping_address || 'Địa chỉ nhận hàng mặc định'}
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl border border-zinc-100 space-y-5">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900">
                                    <CreditCard size={16} className="text-emerald-600" /> Hình thức thanh toán
                                </h4>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-center text-sm font-black border-b border-zinc-50 pb-4">
                                        <span className="text-zinc-600 uppercase text-[9px] tracking-widest font-black">Phương thức</span>
                                        <span className="text-zinc-950 font-black">{order.payment_method?.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-black pt-1">
                                        <span className="text-zinc-600 uppercase text-[9px] tracking-widest font-black">Trạng thái</span>
                                        <span className={order.payment_status === 'paid' ? 'text-emerald-600 font-black underline underline-offset-4' : 'text-zinc-600'}>{payStatus.label}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl border border-zinc-100 space-y-5">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900">
                                    <TruckIcon size={16} className="text-orange-600" /> Thông tin vận chuyển
                                </h4>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-center text-sm font-black border-b border-zinc-50 pb-4">
                                        <span className="text-zinc-600 uppercase text-[9px] tracking-widest font-black">Cước vận chuyển</span>
                                        <span className="text-zinc-950 font-black">{Number(order.shipping_fee) > 0 ? formatCurrency(order.shipping_fee) : 'Miễn phí'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-black pt-1">
                                        <span className="text-zinc-600 uppercase text-[9px] tracking-widest font-black">Thời gian đặt</span>
                                        <span className="text-zinc-950 font-black tabular-nums">{format(new Date(order.created_at), 'dd/MM/yyyy')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[32px] border border-zinc-200">
                            <div className="bg-zinc-950 px-8 py-5 flex items-center justify-between rounded-t-[32px]">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
                                    <Box size={16} className="text-[#1C8EB8]" /> Chi tiết hàng hóa trong đơn
                                </h4>
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{order.order_items.length} Hạng mục</span>
                            </div>
                            
                            <Table>
                                <TableHeader className="bg-zinc-100/50">
                                    <TableRow className="hover:bg-transparent border-b border-zinc-200">
                                        <TableHead className="font-black text-zinc-950 text-[10px] uppercase tracking-widest h-14 py-0 pl-10">Mô tả sản phẩm</TableHead>
                                        <TableHead className="font-black text-zinc-950 text-[10px] uppercase tracking-widest h-14 py-0 text-right w-[300px] pr-12">Số lượng x Đơn giá</TableHead>
                                        <TableHead className="font-black text-zinc-950 text-[10px] uppercase tracking-widest h-14 py-0 text-right pr-12 w-48">Thành tiền</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedItems.map((group, idx) => {
                                        if (group.is_combo) {
                                            return (
                                                <React.Fragment key={`combo-${idx}`}>
                                                    <TableRow className="bg-blue-50/50 border-l-[6px] border-l-[#1C8EB8] hover:bg-blue-50/70 transition-colors">
                                                        <TableCell colSpan={1} className="py-5 pl-10">
                                                            <div className="flex items-center gap-4">
                                                                <Layers size={18} className="text-[#1C8EB8]" />
                                                                <div className="text-sm font-black text-zinc-950 uppercase tracking-tight">{group.name}</div>
                                                                <Badge className="bg-[#1C8EB8] text-white border-none text-[8px] h-5 tracking-tighter font-black">COMBO SAVER</Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right pr-12 font-black text-[#1C8EB8] text-[10px] uppercase tracking-[0.1em]">Trọn bộ combo</TableCell>
                                                        <TableCell className="text-right pr-12 font-black text-zinc-950 tabular-nums text-sm">
                                                            {formatCurrency(group.total)}
                                                        </TableCell>
                                                    </TableRow>
                                                    {group.items.map((it: OrderItem) => (
                                                        <TableRow key={it.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-transparent transition-colors">
                                                            <TableCell className="pl-20 py-5">
                                                                <div className="flex items-center gap-5">
                                                                    <div className="w-12 h-12 rounded-xl border border-zinc-200 overflow-hidden shrink-0 bg-white">
                                                                        <ProductImage src={it.product_image || it.product?.image || it.variant?.image || ''} className="w-full h-full object-cover" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[13px] font-black text-zinc-900 uppercase tracking-tight leading-none mb-2">{it.product_name}</div>
                                                                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">{it.variant_name}</div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right pr-12">
                                                                <div className="flex items-center justify-end font-black text-zinc-950 tabular-nums text-[13px] gap-2">
                                                                    <span className="min-w-[40px] text-right">x{it.quantity}</span>
                                                                    <span className="text-zinc-400">•</span>
                                                                    <span className="min-w-[100px] text-left">{formatCurrency(it.price)}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right pr-12 text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none italic">Đã kèm trong bộ</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        }

                                        const isReward = group.is_reward;
                                        return (
                                            <TableRow key={group.id} className={`border-b border-zinc-100 last:border-b-0 transition-colors hover:bg-zinc-50 ${isReward ? 'bg-emerald-50/40' : ''}`}>
                                                <TableCell className="py-6 pl-10">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-14 h-14 rounded-2xl border border-zinc-200 overflow-hidden shrink-0 bg-white shadow-md p-0.5">
                                                            <ProductImage src={group.product?.image || group.variant?.image || group.product_image || ''} className="w-full h-full object-cover rounded-xl" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[14px] font-black text-zinc-950 uppercase tracking-tight mb-2 leading-none">{group.product_name}</div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">{group.variant_name}</span>
                                                                {isReward && <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[8px] font-black h-5 px-3 tracking-widest uppercase border-none leading-none shadow-sm">QUÀ TẶNG</Badge>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-12">
                                                    <div className="flex items-center justify-end font-black text-zinc-950 tabular-nums text-[13px] gap-2">
                                                        <span className="min-w-[40px] text-right">x{group.quantity}</span>
                                                        <span className="text-zinc-400">•</span>
                                                        <span className="min-w-[100px] text-left">{formatCurrency(group.price)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-12 font-black text-zinc-950 text-sm tabular-nums">
                                                    {isReward ? <span className="text-emerald-600 font-black uppercase text-[12px]">MIỄN PHÍ</span> : formatCurrency(group.total)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                            <div className="lg:col-span-2">
                                <div className="h-full bg-orange-50/50 border border-orange-200/60 rounded-[32px] p-10 flex flex-col justify-center">
                                    <div className="flex items-center gap-3 text-orange-900 font-black uppercase text-[11px] tracking-widest mb-5">
                                        <Info size={16} /> Ghi chú từ khách hàng
                                    </div>
                                    <p className="text-[14px] font-black text-orange-950 leading-relaxed tabular-nums">
                                        {order.notes ? `"${order.notes}"` : "Đơn hàng không có ghi chú yêu cầu từ người mua."}
                                    </p>
                                </div>
                            </div>
                            <div className="lg:col-span-3 bg-white rounded-[32px] border border-zinc-200 p-10 space-y-6">
                                <div className="flex justify-between items-center text-[13px] font-black text-zinc-600 uppercase tracking-widest">
                                    <span>Tạm tính hàng hóa</span>
                                    <span className="text-zinc-950 tabular-nums text-lg font-black">{formatCurrency(displayedSubtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px] font-black text-rose-600 uppercase tracking-widest">
                                    <span className="flex items-center gap-2"><Gift size={15} /> Giảm giá khuyến mãi</span>
                                    <span className="tabular-nums text-lg font-black">- {formatCurrency(displayedDiscount)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px] font-black text-zinc-600 uppercase tracking-widest">
                                    <span>Cước phí vận chuyển</span>
                                    <span className="text-zinc-950 tabular-nums text-lg font-black">+{formatCurrency(order.shipping_fee)}</span>
                                </div>
                                <div className="pt-8 border-t border-zinc-100 mt-4 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.1em] leading-none mb-1">Thanh toán cuối cùng</span>
                                    </div>
                                    <span className="text-4xl font-black text-[#1C8EB8] tabular-nums tracking-tighter leading-none">{formatCurrency(order.total_amount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex items-center justify-center">
                    <Button 
                        variant="ghost" 
                        onClick={onClose} 
                        className="w-full max-w-sm h-14 bg-white border border-zinc-200 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-zinc-950 hover:bg-[#1C8EB8] hover:text-white transition-all shadow-xl"
                    >
                        Trở lại danh sách giao dịch
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
