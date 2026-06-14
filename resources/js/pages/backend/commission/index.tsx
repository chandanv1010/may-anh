import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, router } from '@inertiajs/react';
import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CustomPagination from '@/components/custom-pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, User as UserIcon, Calendar as CalendarIcon, Percent, DollarSign, RefreshCcw, Filter, UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Quản lý hoa hồng', href: '/backend/commission' },
];

interface ICommissionHistory {
    id: number;
    booking_order_id: number;
    user_id: number;
    received_from_user_id: number | null;
    type: 'creator' | 'manager';
    order_amount: string;
    commission_rate: string;
    commission_amount: string;
    status: 'active' | 'refunded';
    description: string;
    created_at: string;
    user?: { id: number; name: string; email: string };
    received_from?: { id: number; name: string; email: string };
}

interface IStats {
    total_paid: number;
    current_month_paid: number;
    orders_count: number;
}

interface IMember {
    id: number;
    name: string;
    email: string;
}

interface CommissionIndexProps {
    histories: IPaginate<ICommissionHistory>;
    stats: IStats;
    allowedMembers: IMember[];
    request: { user_id?: string; month?: string };
    currentUser: { id: number; name: string; email: string; is_super_admin: boolean };
}

export default function CommissionIndex({
    histories,
    stats,
    allowedMembers = [],
    request = {},
    currentUser,
}: CommissionIndexProps) {
    const [userId, setUserId] = useState(request.user_id || '');
    const [month, setMonth] = useState(request.month || '');

    // Format currency to VND
    const formatVND = (value: number | string) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
    };

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/backend/commission', {
            user_id: userId,
            month: month,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleReset = () => {
        setUserId('');
        setMonth('');
        router.get('/backend/commission', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quản lý hoa hồng" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6 bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <HeadingSmall
                        title="Quản lý hoa hồng"
                        description="Hệ thống tự động tính toán hoa hồng cho cá nhân chốt đơn và cấp quản lý."
                    />
                </div>

                {/* Statistics Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg border-l-4 border-l-emerald-500 bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Tổng hoa hồng thực nhận</CardTitle>
                            <div className="rounded-full p-2 bg-emerald-50 text-emerald-600">
                                <DollarSign className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{formatVND(stats.total_paid)}</div>
                            <p className="text-xs text-slate-400 mt-1">Đã khấu trừ các đơn hàng hoàn/huỷ</p>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg border-l-4 border-l-blue-500 bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Hoa hồng tháng hiện tại</CardTitle>
                            <div className="rounded-full p-2 bg-blue-50 text-blue-600">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{formatVND(stats.current_month_paid)}</div>
                            <p className="text-xs text-slate-400 mt-1">Số liệu tính đến hiện tại của tháng này</p>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg border-l-4 border-l-violet-500 bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Số đơn được tính hoa hồng</CardTitle>
                            <div className="rounded-full p-2 bg-violet-50 text-violet-600">
                                <UserCheck className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats.orders_count} đơn</div>
                            <p className="text-xs text-slate-400 mt-1">Chỉ tính các đơn hàng đã hoàn tất thành công</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Section */}
                <Card className="bg-white border shadow-sm">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-400" />
                            Bộ lọc tìm kiếm
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <form onSubmit={handleFilter} className="flex flex-wrap items-end gap-4">
                            {allowedMembers.length > 0 && (
                                <div className="space-y-1.5 flex-1 min-w-[200px]">
                                    <Label htmlFor="member-filter" className="text-xs font-semibold text-slate-600">Thành viên</Label>
                                    <select
                                        id="member-filter"
                                        value={userId}
                                        onChange={(e) => setUserId(e.target.value)}
                                        className="w-full h-9 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400"
                                    >
                                        <option value="">-- Tất cả thành viên --</option>
                                        {allowedMembers.map(member => (
                                            <option key={member.id} value={member.id}>
                                                {member.name} ({member.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-1.5 flex-1 min-w-[200px]">
                                <Label htmlFor="month-filter" className="text-xs font-semibold text-slate-600">Chọn tháng</Label>
                                <input
                                    id="month-filter"
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="w-full h-9 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400"
                                />
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <Button type="submit" className="h-9 px-4 cursor-pointer bg-slate-900 hover:bg-slate-800 text-white">
                                    Áp dụng
                                </Button>
                                <Button type="button" variant="outline" onClick={handleReset} className="h-9 px-3 cursor-pointer">
                                    <RefreshCcw className="h-4 w-4 mr-1" />
                                    Đặt lại
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* History Table */}
                <Card className="bg-white border shadow-sm flex-1 flex flex-col">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-semibold">Lịch sử hoa hồng chi tiết</CardTitle>
                        <CardDescription>Bảng hiển thị các giao dịch hoa hồng phát sinh từ đơn đặt lịch máy.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        <div className="rounded-md border border-slate-100">
                            <Table>
                                <TableHeader className="bg-slate-50/70">
                                    <TableRow>
                                        <TableHead className="w-[80px]">Mã đơn</TableHead>
                                        <TableHead>Người nhận</TableHead>
                                        <TableHead>Vai trò</TableHead>
                                        <TableHead>Tạo bởi (cấp dưới)</TableHead>
                                        <TableHead className="text-right">Doanh thu đơn</TableHead>
                                        <TableHead className="text-center">Tỉ lệ</TableHead>
                                        <TableHead className="text-right">Hoa hồng nhận</TableHead>
                                        <TableHead>Thời gian</TableHead>
                                        <TableHead>Mô tả chi tiết</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {histories.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                                                Không tìm thấy giao dịch hoa hồng nào trong kỳ.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        histories.data.map((history) => {
                                            const isRefund = parseFloat(history.commission_amount) < 0;
                                            return (
                                                <TableRow key={history.id} className={isRefund ? 'bg-red-50/30' : ''}>
                                                    <TableCell className="font-semibold text-blue-600">
                                                        BK-{history.booking_order_id}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-slate-800">{history.user?.name || 'N/A'}</div>
                                                        <div className="text-xs text-slate-400">{history.user?.email}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {history.type === 'creator' ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                                                                Cá nhân tự chốt
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                                                                Hoa hồng quản lý
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {history.received_from ? (
                                                            <div>
                                                                <span className="text-sm font-medium text-slate-700">{history.received_from.name}</span>
                                                                <span className="text-xs text-slate-400 block">{history.received_from.email}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {formatVND(history.order_amount)}
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium text-slate-600">
                                                        {history.commission_rate}%
                                                    </TableCell>
                                                    <TableCell className={`text-right font-semibold ${isRefund ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {isRefund ? '-' : '+'}{formatVND(Math.abs(parseFloat(history.commission_amount)))}
                                                    </TableCell>
                                                    <TableCell className="text-slate-500 text-sm">
                                                        {history.created_at}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 text-xs max-w-[200px] truncate" title={history.description}>
                                                        {history.description}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>

                    {/* Pagination */}
                    {histories.links && histories.links.length > 3 && (
                        <div className="py-4 border-t flex justify-end px-6">
                            <CustomPagination
                                links={histories.links}
                                currentPage={histories.current_page}
                            />
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
