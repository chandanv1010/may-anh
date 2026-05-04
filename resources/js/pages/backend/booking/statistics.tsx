import React, { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { 
    format, 
    parseISO, 
    isSameMonth
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
    TrendingUp, 
    Users, 
    Camera, 
    Search,
    DollarSign,
    ShoppingBag,
    Calendar as CalendarIcon,
    User as UserIcon,
    Clock,
    UserCheck,
    ChevronRight
} from 'lucide-react';
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { 
    Card, 
    CardContent, 
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatisticsProps {
    orders: any[];
    users: any[];
    machines: any[];
    isSuperAdmin: boolean;
}

const Statistics = ({ orders, users, machines, isSuperAdmin }: StatisticsProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [userFilter, setUserFilter] = useState('all');
    const [timeRange, setTimeRange] = useState('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const getOrderStartDate = (order: any) => {
        if (!order.bookings || order.bookings.length === 0) return order.created_at;
        const dates = order.bookings.map((b: any) => b.booking_date).sort();
        return dates[0];
    };

    const getUser = (userId: number) => {
        return users.find(u => u.id === userId) || { name: 'N/A', color: '#cbd5e1' };
    };

    const getRentalDuration = (bookings: any[]) => {
        if (!bookings || bookings.length === 0) return '';
        const uniqueDates = new Set(bookings.map(b => b.booking_date));
        return `${uniqueDates.size}N`;
    };

    const getRentalRange = (bookings: any[]) => {
        if (!bookings || bookings.length === 0) return '';
        const sorted = [...bookings].sort((a, b) => {
            if (a.booking_date !== b.booking_date) return a.booking_date.localeCompare(b.booking_date);
            const slotOrder: { [key: string]: number } = { 'S': 1, 'C': 2, 'T': 3 };
            return slotOrder[a.slot] - slotOrder[b.slot];
        });
        const start = sorted[0];
        const end = sorted[sorted.length - 1];
        const formatDate = (dateStr: string) => {
            const d = parseISO(dateStr);
            return `${d.getDate()}/${d.getMonth() + 1}`;
        };
        return `${start.slot.toLowerCase()}${formatDate(start.booking_date)}-${end.slot.toLowerCase()}${formatDate(end.booking_date)}`;
    };

    const getDistributedRevenue = (order: any, fromDate?: Date, toDate?: Date) => {
        if (!order.bookings || order.bookings.length === 0) return { period: order.final_amount, total: order.final_amount };
        
        const totalSlots = order.bookings.length;
        const amountPerSlot = Number(order.final_amount) / totalSlots;
        
        let periodSlots = 0;
        order.bookings.forEach((b: any) => {
            const bDate = parseISO(b.booking_date);
            let inRange = true;
            if (fromDate && bDate < fromDate) inRange = false;
            if (toDate && bDate > toDate) inRange = false;
            if (inRange) periodSlots++;
        });

        return {
            period: periodSlots * amountPerSlot,
            total: Number(order.final_amount),
            isSplit: periodSlots < totalSlots
        };
    };

    const currentRange = useMemo(() => {
        const now = new Date();
        let from: Date | undefined = undefined;
        let to: Date | undefined = new Date();
        to.setHours(23, 59, 59, 999);

        if (timeRange === '7d') {
            from = new Date();
            from.setDate(now.getDate() - 7);
            from.setHours(0, 0, 0, 0);
        } else if (timeRange === '15d') {
            from = new Date();
            from.setDate(now.getDate() - 15);
            from.setHours(0, 0, 0, 0);
        } else if (timeRange === '30d') {
            from = new Date();
            from.setDate(now.getDate() - 30);
            from.setHours(0, 0, 0, 0);
        } else if (timeRange === '90d') {
            from = new Date();
            from.setDate(now.getDate() - 90);
            from.setHours(0, 0, 0, 0);
        } else if (timeRange === 'custom') {
            from = dateRange?.from;
            to = dateRange?.to ? new Date(dateRange.to) : undefined;
            if (to) to.setHours(23, 59, 59, 999);
        } else {
            // all time
            from = undefined;
            to = undefined;
        }
        return { from, to };
    }, [timeRange, dateRange]);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch = order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || order.customer_phone?.includes(searchTerm);
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            const matchesUser = userFilter === 'all' || order.staff_chot_id === parseInt(userFilter);
            
            // Lọc theo thời gian: Đơn hàng có bất kỳ booking nào trong khoảng thời gian này
            let matchesTime = true;
            if (currentRange.from || currentRange.to) {
                matchesTime = order.bookings.some((b: any) => {
                    const bDate = parseISO(b.booking_date);
                    if (currentRange.from && bDate < currentRange.from) return false;
                    if (currentRange.to && bDate > currentRange.to) return false;
                    return true;
                });
            }
            
            return matchesSearch && matchesStatus && matchesUser && matchesTime;
        });
    }, [orders, searchTerm, statusFilter, userFilter, currentRange]);

    const groupedOrders = useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        filteredOrders.forEach(order => {
            const date = getOrderStartDate(order);
            if (!groups[date]) groups[date] = [];
            groups[date].push(order);
        });
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [filteredOrders]);

    const metrics = useMemo(() => {
        const realOrders = filteredOrders.filter(o => o.status !== 'maintenance' && o.customer_name !== 'BẢO TRÌ');

        let totalPeriod = 0;
        let totalFull = 0;
        
        realOrders.forEach(order => {
            const { period, total } = getDistributedRevenue(order, currentRange.from, currentRange.to);
            totalPeriod += period;
            totalFull += total;
        });

        const count = realOrders.length;
        const avg = count > 0 ? totalPeriod / count : 0;
        return { total: totalFull, final: totalPeriod, count, avg };
    }, [filteredOrders, currentRange]);

    const formatCurrency = (value: number) => {
        if (isNaN(value)) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const getStatusBadge = (status: string, customerName: string) => {
        if (status === 'maintenance' || customerName === 'BẢO TRÌ') {
            return (
                <Badge variant="outline" className="font-bold text-[10px] uppercase px-2 py-0.5 bg-slate-50 text-slate-400 border-slate-200">
                    Bảo trì
                </Badge>
            );
        }
        const configs: { [key: string]: { label: string, color: string } } = {
            'pending': { label: 'Chờ giao', color: 'bg-amber-100 text-amber-700 border-amber-200' },
            'renting': { label: 'Đang thuê', color: 'bg-blue-100 text-blue-700 border-blue-200' },
            'finished': { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            'canceled': { label: 'Đã hủy', color: 'bg-rose-100 text-rose-700 border-rose-200' }
        };
        const config = configs[status] || { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
        return (
            <Badge variant="outline" className={cn("font-bold text-[10px] uppercase px-2 py-0.5", config.color)}>
                {config.label}
            </Badge>
        );
    };

    return (
        <AppLayout>
            <Head title="Báo cáo doanh thu" />
            
            <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
                {/* Metrics Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Thống kê doanh thu</h1>
                        <p className="text-sm text-slate-500">Quản lý hiệu quả kinh doanh và lịch sử thuê máy</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="Tìm khách hàng..." 
                                className="pl-9 w-64 bg-white border-slate-200 h-10 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-40 bg-white border-slate-200 h-10 shadow-sm">
                                <SelectValue placeholder="Khoảng thời gian" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả thời gian</SelectItem>
                                <SelectItem value="7d">7 ngày qua</SelectItem>
                                <SelectItem value="15d">15 ngày qua</SelectItem>
                                <SelectItem value="30d">30 ngày qua</SelectItem>
                                <SelectItem value="90d">90 ngày qua</SelectItem>
                                <SelectItem value="custom">Tùy chọn ngày</SelectItem>
                            </SelectContent>
                        </Select>

                        {timeRange === 'custom' && (
                            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                <DatePickerWithRange 
                                    date={dateRange} 
                                    setDate={setDateRange}
                                    className="bg-white"
                                />
                            </div>
                        )}

                        {isSuperAdmin && (
                            <Select value={userFilter} onValueChange={setUserFilter}>
                                <SelectTrigger className="w-40 bg-white border-slate-200 h-10 shadow-sm">
                                    <SelectValue placeholder="Nhân viên" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả NV</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                {/* Stats Cards - Sharp & Clear */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-none shadow-sm bg-white overflow-hidden border-b-2 border-blue-500">
                        <CardContent className="p-5 flex items-center space-x-4">
                            <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><TrendingUp size={20} /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng doanh thu</p>
                                <h3 className="text-xl font-black text-slate-900">{formatCurrency(metrics.total)}</h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-white overflow-hidden border-b-2 border-emerald-500">
                        <CardContent className="p-5 flex items-center space-x-4">
                            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><DollarSign size={20} /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thực nhận (Sau KM)</p>
                                <h3 className="text-xl font-black text-slate-900">{formatCurrency(metrics.final)}</h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-white overflow-hidden border-b-2 border-amber-500">
                        <CardContent className="p-5 flex items-center space-x-4">
                            <div className="p-3 bg-amber-50 rounded-lg text-amber-600"><ShoppingBag size={20} /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số lượng đơn</p>
                                <h3 className="text-xl font-black text-slate-900">{metrics.count} <span className="text-sm font-normal">đơn</span></h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-white overflow-hidden border-b-2 border-violet-500">
                        <CardContent className="p-5 flex items-center space-x-4">
                            <div className="p-3 bg-violet-50 rounded-lg text-violet-600"><Users size={20} /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">TB mỗi đơn</p>
                                <h3 className="text-xl font-black text-slate-900">{formatCurrency(metrics.avg)}</h3>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Table - Sharp & Professional */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 border-b border-slate-200">
                                <TableRow>
                                    <TableHead className="w-8 text-center text-[10px] font-black uppercase text-slate-500 pr-0">#</TableHead>
                                    <TableHead className="w-[280px] text-[10px] font-black uppercase text-slate-500">Khách hàng</TableHead>
                                    <TableHead className="w-[180px] text-[10px] font-black uppercase text-slate-500">Thời gian</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-500">Tên máy</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-500">NV Chốt</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase text-slate-500">Thành tiền</TableHead>
                                    <TableHead className="text-center text-[10px] font-black uppercase text-slate-500">Trạng thái</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-500">Ghi chú</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedOrders.length > 0 ? groupedOrders.map(([date, items], gIdx) => (
                                    <React.Fragment key={date}>
                                        {/* Group Header Row */}
                                        <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                            <TableCell colSpan={8} className="py-2.5 px-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2 text-slate-600">
                                                        <CalendarIcon size={14} />
                                                        <span className="text-xs font-black uppercase tracking-widest">
                                                            Ngày {format(parseISO(date), 'dd/MM/yyyy', { locale: vi })}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs font-bold text-blue-700">
                                                        Tổng cộng ngày: {formatCurrency(items.reduce((s, i) => s + Number(i.final_amount || 0), 0))}
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        
                                        {/* Order Rows */}
                                        {items.map((order, oIdx) => {
                                            const staff = getUser(order.staff_chot_id);
                                            return (
                                                <TableRow key={order.id} className="hover:bg-slate-50/50 border-b border-slate-100 last:border-b-0 transition-colors">
                                                    <TableCell className="text-center text-[10px] font-bold text-slate-400 pr-0">
                                                        {(gIdx * 0) + oIdx + 1}
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <div className="font-bold text-slate-900">{order.customer_name}</div>
                                                        <div className="text-[10px] text-slate-500 font-medium">{order.customer_phone}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-black border border-slate-200">
                                                                {getRentalDuration(order.bookings)}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-500 tracking-tight">
                                                                :{getRentalRange(order.bookings)}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center space-x-2">
                                                            <div className="text-slate-300"><Camera size={14} /></div>
                                                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]" title={order.bookings?.[0]?.product?.name}>
                                                                {order.bookings?.[0]?.product?.name || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge 
                                                            variant="secondary" 
                                                            className="text-[9px] font-black text-white border-none px-2 py-0.5"
                                                            style={{ backgroundColor: staff.color }}
                                                        >
                                                            {staff.name}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {(order.status === 'maintenance' || order.customer_name === 'BẢO TRÌ') ? (
                                                            <div className="text-sm font-bold text-slate-300">-</div>
                                                        ) : (() => {
                                                            const { period, total, isSplit } = getDistributedRevenue(order, currentRange.from, currentRange.to);
                                                            return (
                                                                <>
                                                                    <div className="text-sm font-black text-slate-900">{formatCurrency(period)}</div>
                                                                    {isSplit && (
                                                                        <div className="text-[9px] text-slate-400 font-medium">Tổng: {formatCurrency(total)}</div>
                                                                    )}
                                                                    {order.discount_amount > 0 && !isSplit && (
                                                                        <div className="text-[9px] text-rose-500 line-through">-{formatCurrency(order.discount_amount)}</div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {getStatusBadge(order.status, order.customer_name)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-[10px] text-slate-400 max-w-[120px] truncate" title={order.notes}>
                                                            {order.notes || '---'}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </React.Fragment>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-20 text-center text-slate-400">
                                            Không có dữ liệu đơn hàng phù hợp.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                
                /* Ensure standard sans-serif font */
                body, table, input, select {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                }
            `}} />
        </AppLayout>
    );
};

export default Statistics;
