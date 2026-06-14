import React, { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { 
    format, 
    parseISO, 
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
    TrendingUp, 
    Users, 
    Search,
    DollarSign,
    ShoppingBag,
    Calendar as CalendarIcon,
} from 'lucide-react';
import { DateRange } from "react-day-picker";
import { 
    Card, 
    CardContent, 
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
    filteredUsers: any[];
    machines: any[];
    isSuperAdmin: boolean;
    request: {
        month: string;
        user_id: string;
    };
}

const Statistics = ({ orders, users, filteredUsers = [], machines, isSuperAdmin, request }: StatisticsProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Parse Month and Year from request.month (e.g. '2026-06')
    const [selectedYear, selectedMonth] = useMemo(() => {
        const parts = (request.month || '').split('-');
        if (parts.length === 2) {
            return [parts[0], parseInt(parts[1]).toString()];
        }
        const now = new Date();
        return [now.getFullYear().toString(), (now.getMonth() + 1).toString()];
    }, [request.month]);

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = Array.from({ length: 7 }, (_, i) => 2024 + i); // 2024 to 2030

    const handleTimeChange = (newMonth: string, newYear: string) => {
        const formattedMonth = newMonth.padStart(2, '0');
        router.get('/backend/booking/statistics', {
            month: `${newYear}-${formattedMonth}`,
            user_id: request.user_id || 'all'
        });
    };

    const handleUserChange = (newUserId: string) => {
        router.get('/backend/booking/statistics', {
            month: request.month,
            user_id: newUserId
        });
    };

    const { startOfMonthDate, endOfMonthDate } = useMemo(() => {
        const parts = (request.month || '').split('-');
        let year = new Date().getFullYear();
        let monthNum = new Date().getMonth();
        if (parts.length === 2) {
            year = parseInt(parts[0]);
            monthNum = parseInt(parts[1]) - 1;
        }
        const from = new Date(year, monthNum, 1);
        const to = new Date(year, monthNum + 1, 0, 23, 59, 59, 999);
        return { startOfMonthDate: from, endOfMonthDate: to };
    }, [request.month]);

    const getOrderStartDate = (order: any) => {
        if (!order.bookings || order.bookings.length === 0) {
            return (order.created_at || '').substring(0, 10);
        }
        const dates = order.bookings.map((b: any) => b.booking_date).sort();
        return dates[0];
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
        if (!order.bookings || order.bookings.length === 0) return { period: Number(order.final_amount), total: Number(order.final_amount) };
        
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

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch = order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || order.customer_phone?.includes(searchTerm);
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [orders, searchTerm, statusFilter]);

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
            const { period, total } = getDistributedRevenue(order, startOfMonthDate, endOfMonthDate);
            totalPeriod += period;
            totalFull += total;
        });

        const count = realOrders.length;
        const avg = count > 0 ? totalPeriod / count : 0;
        return { total: totalFull, final: totalPeriod, count, avg };
    }, [filteredOrders, startOfMonthDate, endOfMonthDate]);

    const formatCurrency = (value: number) => {
        if (isNaN(value)) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const getStatusBadge = (status: string, customerName: string) => {
        if (status === 'maintenance' || customerName === 'BẢO TRÌ') {
            return (
                <Badge variant="outline" className="font-black text-[9px] uppercase px-1.5 py-0.5 bg-slate-100 text-slate-400 border-slate-300">
                    Bảo trì
                </Badge>
            );
        }
        const configs: { [key: string]: { label: string, color: string } } = {
            'pending': { label: 'Chờ giao', color: 'bg-amber-100 text-amber-700 border-amber-200' },
            'renting': { label: 'Đang thuê', color: 'bg-rose-100 text-rose-700 border-rose-200' },
            'finished': { label: 'Xong', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            'cancelled': { label: 'Đã hủy', color: 'bg-slate-200 text-slate-600 border-slate-300' },
            'canceled': { label: 'Đã hủy', color: 'bg-slate-200 text-slate-600 border-slate-300' }
        };
        const config = configs[status] || { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
        return (
            <Badge variant="outline" className={cn("font-black text-[9px] uppercase px-1.5 py-0.5", config.color)}>
                {config.label}
            </Badge>
        );
    };

    const getRowBgClass = (status: string, customerName: string) => {
        if (status === 'maintenance' || customerName === 'BẢO TRÌ') {
            return 'bg-slate-50/70 hover:bg-slate-100/90 text-slate-400';
        }
        switch (status) {
            case 'pending':
                return 'bg-amber-50/70 hover:bg-amber-100/70 text-amber-900';
            case 'renting':
                return 'bg-rose-50/50 hover:bg-rose-100/60 text-rose-900';
            case 'finished':
                return 'bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-900';
            case 'cancelled':
            case 'canceled':
                return 'bg-slate-100/60 hover:bg-slate-200/50 text-slate-400';
            default:
                return 'hover:bg-slate-50';
        }
    };

    const renderStaffBadge = (staff: any) => {
        if (!staff) return <span className="text-slate-300">-</span>;
        return (
            <Badge 
                variant="secondary" 
                className="text-[9px] font-black text-white border-none px-2 py-0.5 whitespace-nowrap"
                style={{ backgroundColor: staff.color || '#94a3b8' }}
            >
                {staff.name}
            </Badge>
        );
    };

    const getCommissionForUser = (order: any, userId: number) => {
        if (!order.commissions) return 0;
        return order.commissions
            .filter((c: any) => c.user_id === userId)
            .reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);
    };

    // Calculate Grand Totals for displayed orders
    const totalRentPrice = useMemo(() => {
        return filteredOrders.reduce((sum, order) => {
            if (order.status === 'maintenance' || order.customer_name === 'BẢO TRÌ') return sum;
            return sum + Number(order.final_amount || 0);
        }, 0);
    }, [filteredOrders]);

    const userCommissionTotals = useMemo(() => {
        const totals: { [key: number]: number } = {};
        filteredUsers.forEach((user: any) => {
            totals[user.id] = filteredOrders.reduce((sum, order) => {
                return sum + getCommissionForUser(order, user.id);
            }, 0);
        });
        return totals;
    }, [filteredOrders, filteredUsers]);

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
                                className="pl-9 w-48 bg-white border-slate-200 h-10 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Month Selector */}
                        <Select value={selectedMonth} onValueChange={(val) => handleTimeChange(val, selectedYear)}>
                            <SelectTrigger className="w-28 bg-white border-slate-200 h-10 shadow-sm">
                                <SelectValue placeholder="Tháng" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => (
                                    <SelectItem key={m} value={m.toString()}>Tháng {m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Year Selector */}
                        <Select value={selectedYear} onValueChange={(val) => handleTimeChange(selectedMonth, val)}>
                            <SelectTrigger className="w-28 bg-white border-slate-200 h-10 shadow-sm">
                                <SelectValue placeholder="Năm" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem key={y} value={y.toString()}>Năm {y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-32 bg-white border-slate-200 h-10 shadow-sm">
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                <SelectItem value="pending">Chờ giao</SelectItem>
                                <SelectItem value="renting">Đang thuê</SelectItem>
                                <SelectItem value="finished">Xong</SelectItem>
                                <SelectItem value="cancelled">Đã hủy</SelectItem>
                                <SelectItem value="maintenance">Bảo trì</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Personnel Filter */}
                        <Select value={request.user_id || 'all'} onValueChange={handleUserChange}>
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
                                {/* Row 1: Headers */}
                                <TableRow>
                                    <TableHead className="w-8 text-center text-[10px] font-black uppercase text-slate-500 pr-0">#</TableHead>
                                    <TableHead className="w-[120px] text-[10px] font-black uppercase text-slate-500">Thời gian</TableHead>
                                    <TableHead className="w-[120px] text-[10px] font-black uppercase text-slate-500">Tên máy</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-500">NV Chốt</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-500">Giao máy</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-500">Giao khách</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-500">NV Nhận</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-500">NV Giữ</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-500">Trạng thái</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-500">Ghi chú</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-500">Cọc</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase text-slate-500">Giá thuê</TableHead>
                                    {filteredUsers.map((user: any) => (
                                        <TableHead key={user.id} className="text-right text-[10px] font-black uppercase text-slate-500 min-w-[100px]">
                                            {user.name}
                                        </TableHead>
                                    ))}
                                </TableRow>
                                {/* Row 2: Grand Totals */}
                                <TableRow className="bg-slate-100/50 border-b border-slate-200 font-semibold text-slate-700">
                                    <TableCell colSpan={11} className="py-2.5 text-right text-[10px] uppercase tracking-wider text-slate-500 font-black pr-4">
                                        Tổng cộng:
                                    </TableCell>
                                    <TableCell className="py-2.5 text-right text-xs font-black text-rose-600 bg-rose-50/30">
                                        {formatCurrency(totalRentPrice)}
                                    </TableCell>
                                    {filteredUsers.map((user: any) => (
                                        <TableCell key={user.id} className="py-2.5 text-right text-xs font-black text-rose-600 bg-rose-50/30">
                                            {formatCurrency(userCommissionTotals[user.id] || 0)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedOrders.length > 0 ? groupedOrders.map(([date, items], gIdx) => {
                                    // Calculate group totals
                                    const groupTotalRent = items.reduce((sum, order) => {
                                        if (order.status === 'maintenance' || order.customer_name === 'BẢO TRÌ') return sum;
                                        return sum + Number(order.final_amount || 0);
                                    }, 0);

                                    return (
                                        <React.Fragment key={date}>
                                            {/* Group Header Row */}
                                            <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                                <TableCell colSpan={12 + filteredUsers.length} className="py-2.5 px-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2 text-slate-600">
                                                            <CalendarIcon size={14} />
                                                            <span className="text-xs font-black uppercase tracking-widest">
                                                                Ngày {format(parseISO(date), 'dd/MM/yyyy', { locale: vi })}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs font-bold text-blue-700">
                                                            Tổng cộng ngày: {formatCurrency(groupTotalRent)}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            
                                            {/* Order Rows */}
                                            {items.map((order, oIdx) => {
                                                return (
                                                    <TableRow 
                                                        key={order.id} 
                                                        className={cn("border-b border-slate-100 last:border-b-0 transition-colors font-medium text-xs", getRowBgClass(order.status, order.customer_name))}
                                                    >
                                                        <TableCell className="text-center text-[10px] font-bold text-slate-400 pr-0">
                                                            {oIdx + 1}
                                                        </TableCell>
                                                        <TableCell className="py-3 font-semibold whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-black border border-slate-200">
                                                                    {getRentalDuration(order.bookings)}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-500 tracking-tight">
                                                                    :{getRentalRange(order.bookings)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-3 font-semibold truncate max-w-[140px]" title={order.bookings?.[0]?.product?.name}>
                                                            {order.bookings?.[0]?.product?.name || 'N/A'}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            {renderStaffBadge(order.staff_chot)}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            {renderStaffBadge(order.staff_giao_may)}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            {renderStaffBadge(order.staff_giao_khach)}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            {renderStaffBadge(order.staff_nhan)}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            {renderStaffBadge(order.staff_giu)}
                                                        </TableCell>
                                                        <TableCell className="py-3 text-center">
                                                            {getStatusBadge(order.status, order.customer_name)}
                                                        </TableCell>
                                                        <TableCell className="py-3 text-[10px] max-w-[120px] truncate" title={order.notes}>
                                                            {order.notes || '---'}
                                                        </TableCell>
                                                        <TableCell className="py-3 text-[10px] text-slate-600 font-bold whitespace-nowrap">
                                                            {order.deposit_info || '---'}
                                                        </TableCell>
                                                        <TableCell className="py-3 text-right font-black">
                                                            {order.status === 'maintenance' || order.customer_name === 'BẢO TRÌ' ? (
                                                                <span className="text-slate-300">-</span>
                                                            ) : (
                                                                formatCurrency(order.final_amount)
                                                            )}
                                                        </TableCell>
                                                        {/* Dynamic Collaborator Commission Cells */}
                                                        {filteredUsers.map((user: any) => {
                                                            const comm = getCommissionForUser(order, user.id);
                                                            return (
                                                                <TableCell key={user.id} className="py-3 text-right font-bold text-slate-800">
                                                                    {comm > 0 ? formatCurrency(comm) : '0'}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                );
                                            })}

                                            {/* Grey Sub-total Row */}
                                            <TableRow className="bg-slate-100/80 border-b border-slate-200 font-semibold text-slate-700">
                                                <TableCell colSpan={11} className="py-2.5 text-right text-[10px] uppercase tracking-wider text-slate-500 font-black pr-4">
                                                    Cộng ngày:
                                                </TableCell>
                                                <TableCell className="py-2.5 text-right text-xs font-black text-slate-900 bg-slate-200/50">
                                                    {formatCurrency(groupTotalRent)}
                                                </TableCell>
                                                {filteredUsers.map((user: any) => {
                                                    const groupUserComm = items.reduce((sum, order) => sum + getCommissionForUser(order, user.id), 0);
                                                    return (
                                                        <TableCell key={user.id} className="py-2.5 text-right text-xs font-black text-slate-900 bg-slate-200/50">
                                                            {groupUserComm > 0 ? formatCurrency(groupUserComm) : '0'}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={12 + filteredUsers.length} className="py-20 text-center text-slate-400">
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
