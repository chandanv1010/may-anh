import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
// import { Input } from "./ui/input"
import { JSX } from "react"
import CustomTableSortableHeader from "./custom-table-sortable-header"

export interface IColumn {
    key: string,
    label: string | React.ReactNode,
    className?: string,
    sortable?: boolean
}

interface ICustomTable<T> {
    columns?: IColumn[],
    data: T[],
    render: (item: T) => JSX.Element
}
const CustomTable = <T, >({
    data,
    columns,
    render
}: ICustomTable<T>) => {
    return (
        // overflow-hidden ở đây chỉ để bo tròn 4 góc; phần cuộn ngang nằm ở
        // container bên trong của <Table>, nên nó không cắt mất nội dung nữa.
        <div className="overflow-hidden rounded-[5px] border">
            {/* Trên màn hình hẹp, ép bảng giữ bề ngang tối thiểu rồi cho cuộn,
                thay vì bóp các cột lại đến mức không đọc được. Trên màn hình
                rộng con số này không có tác dụng gì vì bảng vốn đã rộng hơn. */}
            <Table className="min-w-[900px] rounded-[5px]">
                <TableHeader className="bg-gray-200">
                <TableRow>
                    {columns && columns.map(col => (
                        <TableHead key={col.key} className={`${col.className ? col.className : 'w-[100px]'}`}>
                            {typeof col.label === 'string' && col.sortable !== false ? (
                                <CustomTableSortableHeader
                                    columnKey={col.key}
                                    label={col.label}
                                    className={col.className || ''}
                                    sortable={col.sortable !== false}
                                />
                            ) : (
                                col.label
                            )}
                        </TableHead>
                    ))}
                    
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={columns?.length} className="font-medium text-sm text-red-600 text-center">Không tìm thấy dữ liệu phù hợp</TableCell>
                    </TableRow>
                ) : (
                    data.map(item => render(item))
                )}
            </TableBody>
            </Table>
        </div>
    )
}

export default CustomTable