
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { type PageConfig } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { PlusCircle, Calendar, Camera, User as UserIcon, DollarSign, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomFilter from '@/components/custom-filter';
import { useFilter } from '@/hooks/use-filter';
import CustomTable from '@/components/custom-table';
import React, { useMemo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Edit } from 'lucide-react';
import CustomPagination from '@/components/custom-pagination';
import useTable from '@/hooks/use-table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { BookingFormModal } from '@/components/booking/booking-form-modal';
import { Product } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý Đặt lịch',
        href: '#',
    }
];

const pageConfig: PageConfig<any> = {
    module: 'booking',
    heading: 'Quản lý Đơn đặt lịch',
    cardHeading: 'Danh sách Đơn đặt lịch',
    cardDescription: 'Xem và quản lý các đơn đặt lịch máy, trạng thái và doanh thu.',
    filters: [],
    columns: [
        { key: 'id', label: 'ID', className: 'w-[60px]' },
        { key: 'customer', label: 'Khách hàng', className: 'w-[150px]' },
        { key: 'created_date', label: 'Ngày tạo', className: 'w-[100px]' },
        { key: 'created_time', label: 'Giờ tạo', className: 'w-[80px]' },
        { key: 'booking_info', label: 'Thông tin thuê', className: 'w-[150px]' },
        { key: 'product', label: 'Máy thuê' },
        { key: 'final_amount', label: 'Thành tiền', className: 'text-right w-[120px]' },
        { key: 'staff', label: 'NV Chốt', className: 'text-center' },
        { key: 'status', label: 'Trạng thái', className: 'text-center w-[120px]' },
        { key: 'actions', label: 'Thao tác', className: 'w-[100px] text-center' },
    ],
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const getStatusBadge = (status: string) => {
    const configs: { [key: string]: { label: string, color: string } } = {
        'pending': { label: 'Chờ giao', color: 'bg-amber-100 text-amber-700 border-amber-200' },
        'renting': { label: 'Đang thuê', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        'finished': { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        'cancelled': { label: 'Đã hủy', color: 'bg-rose-100 text-rose-700 border-rose-200' },
        'maintenance': { label: 'Bảo trì', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    };
    const config = configs[status] || { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    return (
        <Badge variant="outline" className={cn("font-bold text-[10px] uppercase px-2 py-0.5", config.color)}>
            {config.label}
        </Badge>
    );
};

const TableRowComponent = React.memo(({
    item,
    onEdit
}: {
    item: any,
    onEdit: (item: any) => void
}) => {
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
        const formatDateStr = (dateStr: string) => {
            const d = parseISO(dateStr);
            return `${d.getDate()}/${d.getMonth() + 1}`;
        };
        return `${start.slot.toLowerCase()}${formatDateStr(start.booking_date)}-${end.slot.toLowerCase()}${formatDateStr(end.booking_date)}`;
    };

    return (
        <TableRow key={item.id} className="cursor-pointer">
            <TableCell>{item.id}</TableCell>
            <TableCell>
                <div className="font-bold text-slate-900">{item.customer_name}</div>
                <div className="text-[10px] text-slate-500 font-medium">{item.customer_phone}</div>
            </TableCell>
            <TableCell>
                <div className="text-[11px] font-medium text-slate-600">
                    {format(parseISO(item.created_at), 'dd/MM/yyyy')}
                </div>
            </TableCell>
            <TableCell>
                <div className="text-[10px] text-slate-400 font-bold">
                    {format(parseISO(item.created_at), 'HH:mm:ss')}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center space-x-2">
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-black border border-slate-200">
                        {getRentalDuration(item.bookings)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 tracking-tight">
                        :{getRentalRange(item.bookings)}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center space-x-2">
                    <div className="text-slate-300"><Camera size={14} /></div>
                    <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">
                        {item.bookings?.[0]?.product?.name || 'N/A'}
                    </span>
                </div>
            </TableCell>
            <TableCell className="text-right">
                <div className="text-sm font-black text-slate-900">{formatCurrency(item.final_amount)}</div>
                {item.discount_amount > 0 && (
                    <div className="text-[9px] text-rose-500 line-through">-{formatCurrency(item.discount_amount)}</div>
                )}
            </TableCell>
            <TableCell className="text-center">
                {item.staff_chot ? (
                    <Badge 
                        variant="secondary" 
                        className="text-[9px] font-black text-white border-none px-2 py-0.5"
                        style={{ backgroundColor: item.staff_chot.color }}
                    >
                        {item.staff_chot.name}
                    </Badge>
                ) : <span className="text-slate-300">-</span>}
            </TableCell>
            <TableCell className="text-center">
                {getStatusBadge(item.status)}
            </TableCell>
            <TableCell className="text-center">
                <div className="flex items-center justify-center space-x-1">
                    <Button 
                        type='button' 
                        onClick={() => onEdit(item)}
                        className="size-7 p-0 bg-[#0088FF] cursor-pointer rounded-[5px]"
                    >
                        <Edit size={14} />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    )
})

interface IBookingIndexProps {
    records: IPaginate<any>,
    users: User[],
    machines: Product[],
    catalogues: any[],
    request: any
}

export default function BookingIndex({ records, users, machines, catalogues, request }: IBookingIndexProps) {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedOrder, setSelectedOrder] = React.useState<any>(null);

    const handleEdit = (item: any) => {
        setSelectedOrder(item);
        setIsModalOpen(true);
    };
    const filters = useMemo(() => [
        {
            key: 'status',
            placeholder: 'Trạng thái đơn',
            options: [
                { label: 'Chờ giao', value: 'pending' },
                { label: 'Đang thuê', value: 'renting' },
                { label: 'Hoàn thành', value: 'finished' },
                { label: 'Đã hủy', value: 'cancelled' },
                { label: 'Bảo trì', value: 'maintenance' },
            ],
            defaultValue: [],
            type: 'multiple',
            operator: 'in'
        },
        {
            key: 'staff_chot_id',
            placeholder: 'Nhân viên chốt',
            options: users.map(u => ({ label: u.name, value: u.id.toString() })),
            defaultValue: [],
            type: 'multiple',
            operator: 'in'
        }
    ], [users]);

    const {
        // selection states removed
    } = useTable<any>({ pageConfig, records: records.data })

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading 
                    heading={pageConfig.heading}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container">
                    <CustomCard
                        isShowHeader={true}
                        title={pageConfig.cardHeading}
                        description={pageConfig.cardDescription}
                        isShowFooter={true}
                        footerChildren={
                            <CustomPagination 
                                links={records.links}
                                currentPage={records.current_page}
                            />
                        }
                    >
                        <div className="flex items-center justify-between mb-[10px]">
                            <div className="flex items-center justify-center">
                                <CustomFilter 
                                    filters={filters}
                                />
                            </div>
                            <Link href="/backend/booking/calendar">
                                <Button className="bg-[#ed5565] shadow rounded-[5px] cursor-pointer hover:bg-[#ed5565]/80">
                                    <PlusCircle size={16} className="mr-2" />
                                    Tạo đơn mới
                                </Button>
                            </Link>
                        </div>
                        
                        <CustomTable 
                            data={records.data}
                            columns={(pageConfig.columns ?? [])}
                            render={(item: any) => 
                                <TableRowComponent 
                                    key={item.id}
                                    item={item}
                                    onEdit={handleEdit}
                                />
                            }
                        />
                        
                    </CustomCard>
                </div>
            </div>

            <BookingFormModal 
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                machines={machines}
                users={users}
                catalogues={catalogues}
                bookings={[]} 
                editingOrder={selectedOrder}
                onSuccess={() => {
                    setIsModalOpen(false);
                    // No need for manual refresh if we use router.post which refreshes the page
                }}
            />
        </AppLayout>
    );
}
