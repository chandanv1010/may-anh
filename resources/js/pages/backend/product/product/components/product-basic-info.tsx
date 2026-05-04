import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { SkuInput } from "@/components/sku-input"
import InputError from "@/components/input-error"
import { Switch } from "@/components/ui/switch"
import { Info } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface ProductBasicInfoProps {
    sku?: string
    barcode?: string
    unit?: string
    errors?: Record<string, string>
}

export function ProductBasicInfo({
    sku,
    barcode,
    unit,
    errors
}: ProductBasicInfoProps) {
    return (
        <div className="space-y-4">
            {/* SKU, Barcode, Unit row */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="sku" className="mb-2 block">SKU/Mã sản phẩm</Label>
                    <SkuInput
                        id="sku"
                        name="sku"
                        defaultValue={sku}
                        placeholder="Nhập mã SKU"
                    />
                    {errors?.sku && <InputError message={errors.sku} />}
                </div>

                <div>
                    <Label htmlFor="barcode" className="mb-2 block">Barcode</Label>
                    <Input
                        id="barcode"
                        name="barcode"
                        defaultValue={barcode}
                        placeholder="Nhập barcode"
                    />
                    {errors?.barcode && <InputError message={errors.barcode} />}
                </div>

                <div>
                    <Label htmlFor="unit" className="mb-2 block">Đơn vị tính</Label>
                    <Input
                        id="unit"
                        name="unit"
                        defaultValue={unit || 'cái'}
                        placeholder="VD: cái, hộp, kg"
                    />
                    {errors?.unit && <InputError message={errors.unit} />}
                </div>
            </div>

            {/* Management Type & Backup Status */}
            <div className="border-t pt-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                        <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50 transition-colors">
                            <input
                                type="radio"
                                name="management_type"
                                value="basic"
                                defaultChecked
                                className="w-3.5 h-3.5 text-blue-600"
                            />
                            <span className="text-xs font-medium">Sản phẩm cơ bản</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50 transition-colors">
                            <input
                                type="radio"
                                name="management_type"
                                value="imei"
                                className="w-3.5 h-3.5 text-blue-600"
                            />
                            <span className="text-xs font-medium">IMEI/Series</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50 transition-colors">
                            <input
                                type="radio"
                                name="management_type"
                                value="batch"
                                className="w-3.5 h-3.5 text-blue-600"
                            />
                            <span className="text-xs font-medium">Lô - HSD</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    )
}
