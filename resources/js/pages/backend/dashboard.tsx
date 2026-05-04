import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, Legend, PieChart, Pie
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Package, CreditCard, DollarSign, CheckCircle2, AlertCircle, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardProps {
    revenueByDate: Array<{ date: string, total: number }>;
    machinePerformance: Array<{
        id: number;
        name: string;
        cost_price: number;
        total_revenue: number;
        remaining: number;
        breakeven_percent: number;
        is_breakeven: boolean;
    }>;
    staffPerformance: Array<{
        name: string;
        revenue: number;
        color: string;
    }>;
    machineDistribution: Array<{
        name: string;
        value: number;
    }>;
    monthlyMachineStats: Array<{
        id: string;
        name: string;
        data: Array<{ month: string, value: number }>;
    }>;
    stats: {
        total_revenue: number;
        total_orders: number;
        active_machines: number;
    };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    }
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export default function Dashboard({ 
    revenueByDate, 
    machinePerformance, 
    staffPerformance, 
    machineDistribution, 
    monthlyMachineStats,
    stats 
}: DashboardProps) {
    const [selectedMachineId, setSelectedMachineId] = useState<string>(monthlyMachineStats[0]?.id || '');

    const activeMachineData = useMemo(() => {
        return monthlyMachineStats.find(m => m.id === selectedMachineId)?.data || [];
    }, [selectedMachineId, monthlyMachineStats]);

    const activeMachineName = useMemo(() => {
        return monthlyMachineStats.find(m => m.id === selectedMachineId)?.name || 'N/A';
    }, [selectedMachineId, monthlyMachineStats]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Quản Trị" />
            
            <div className="flex h-full flex-1 flex-col gap-6 p-6 bg-slate-50/50 font-sans">
                {/* Header Stats */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">Tổng Doanh Thu</CardTitle>
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.total_revenue)}</div>
                            <p className="text-xs text-slate-500 mt-1">Tổng cộng từ trước đến nay</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">Số Đơn Hàng</CardTitle>
                            <CreditCard className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats.total_orders}</div>
                            <p className="text-xs text-slate-500 mt-1">Đơn hàng đã hoàn thành</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">Máy Đang Hoạt Động</CardTitle>
                            <Package className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats.active_machines}</div>
                            <p className="text-xs text-slate-500 mt-1">Thiết bị trong danh mục</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">Hiệu Suất TB</CardTitle>
                            <TrendingUp className="h-4 w-4 text-indigo-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">
                                {Math.round(machinePerformance.reduce((acc, curr) => acc + curr.breakeven_percent, 0) / (machinePerformance.length || 1))}%
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Tỷ lệ hoàn vốn trung bình</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-12">
                    {/* Revenue Area Chart */}
                    <Card className="md:col-span-8 shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-800">Biến Động Doanh Thu (30 Ngày)</CardTitle>
                            <CardDescription>Theo dõi doanh thu theo từng ngày</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueByDate}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis 
                                        stroke="#94a3b8" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false}
                                        tickFormatter={(value) => `${value/1000}k`}
                                    />
                                    <Tooltip 
                                        formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="total" 
                                        stroke="#10b981" 
                                        strokeWidth={2}
                                        fillOpacity={1} 
                                        fill="url(#colorTotal)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Staff Performance Chart (Moved Up) */}
                    <Card className="md:col-span-4 shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-800">Hiệu Suất Nhân Viên</CardTitle>
                            <CardDescription>Doanh thu theo người chốt đơn</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={staffPerformance} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={100} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                                        cursor={{ fill: '#f8fafc' }}
                                    />
                                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={24}>
                                        {staffPerformance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || '#94a3b8'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-12">
                    {/* Machine Monthly Trend (Detailed View with Selector) */}
                    <Card className="md:col-span-12 shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                                    Hiệu Suất Thuê Theo Tháng (Năm nay)
                                </CardTitle>
                                <CardDescription>Phân tích lượt thuê và tỷ lệ % giữa các tháng</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-500">Chọn máy:</span>
                                <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                                    <SelectTrigger className="w-[220px] bg-white h-9 text-xs">
                                        <SelectValue placeholder="Chọn máy ảnh" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monthlyMachineStats.map(m => (
                                            <SelectItem key={m.id} value={m.id} className="text-xs">
                                                {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Bar Chart - 2/3 width */}
                                <div className="lg:col-span-2 h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={activeMachineData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="value" name="Lượt thuê" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={35}>
                                                {activeMachineData.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={entry.value > 0 ? '#6366f1' : '#e2e8f0'} 
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                {/* Monthly Distribution Pie Chart - 1/3 width */}
                                <div className="lg:col-span-1 h-[300px] flex flex-col items-center justify-center border-l border-slate-100 pl-4">
                                    <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Phân bổ % theo tháng</div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={activeMachineData.filter(d => d.value > 0)}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={75}
                                                paddingAngle={5}
                                                dataKey="value"
                                                nameKey="month"
                                                label={({ month, percent }) => `${month} ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {activeMachineData.filter(d => d.value > 0).map((entry, index) => (
                                                    <Cell key={`cell-monthly-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-12">
                    {/* Machine Distribution Pie Chart (Moved Down) */}
                    <Card className="md:col-span-4 shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                                <PieIcon className="h-5 w-5 text-indigo-500" />
                                Tỷ Lệ Thuê Theo Máy
                            </CardTitle>
                            <CardDescription>Dữ liệu trong tháng hiện tại</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px] flex flex-col justify-center">
                            <ResponsiveContainer width="100%" height="250">
                                <PieChart>
                                    <Pie
                                        data={machineDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {machineDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-4 grid grid-cols-2 gap-2 overflow-y-auto max-h-[120px] pr-2 custom-scrollbar">
                                {machineDistribution.map((item, index) => (
                                    <div key={item.name} className="flex items-center gap-2 text-[10px]">
                                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                        <span className="text-slate-600 truncate">{item.name}</span>
                                        <span className="font-bold text-slate-900 ml-auto">{item.value} lần</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Machine Breakeven Analysis (Adjusted Span) */}
                    <Card className="md:col-span-8 shadow-sm border-slate-200 overflow-hidden">
                        <CardHeader className="border-b bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg text-slate-800">Phân Tích Điểm Hòa Vốn Từng Máy</CardTitle>
                                    <CardDescription>So sánh Doanh thu lũy kế vs Giá nhập máy</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50/80 text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">Tên Máy</th>
                                            <th className="px-4 py-3 text-right">Giá Nhập</th>
                                            <th className="px-4 py-3 text-right">Doanh Thu</th>
                                            <th className="px-4 py-3">Tiến Độ</th>
                                            <th className="px-4 py-3 text-center">Trạng Thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {machinePerformance.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-slate-700">{item.name}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-slate-600">
                                                    {formatCurrency(item.cost_price)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                    {formatCurrency(item.total_revenue)}
                                                </td>
                                                <td className="px-4 py-3 min-w-[150px]">
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-1000 ${item.is_breakeven ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                                            style={{ width: `${Math.min(item.breakeven_percent, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 mt-1 block">{item.breakeven_percent}%</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {item.is_breakeven ? (
                                                        <span className="text-emerald-600 font-bold">HÒA VỐN</span>
                                                    ) : (
                                                        <span className="text-blue-600 font-bold">THU HỒI</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
