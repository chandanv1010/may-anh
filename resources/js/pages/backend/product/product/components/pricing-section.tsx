import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, AlertCircle, Info } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import InputError from "@/components/input-error"
import { useEffect, useMemo, useState } from "react"
import { NumberInput } from "@/components/number-input"
import { PriceInput } from "@/components/price-input"
import { usePage } from "@inertiajs/react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"

interface PricingTier {
    min_quantity: number
    max_quantity: number | null
    price: number
}

interface PricingSectionProps {
    retailPrice?: number
    wholesalePrice?: number
    price6h?: number
    price1d?: number
    price3d?: number
    price7d?: number
    deposit?: string
    costPrice?: number
    onCostPriceChange?: (value: number | undefined) => void
    applyTax?: boolean
    forceTaxIncluded?: boolean
    pricingTiers?: PricingTier[]
    isBackup?: boolean
    errors?: Record<string, string>
}

type PageProps = {
    tooltips?: {
        product?: {
            cost_price?: string
            retail_price?: string
        }
    }
}

export function PricingSection({
    retailPrice,
    wholesalePrice,
    price6h,
    price1d,
    price3d,
    price7d,
    deposit,
    costPrice,
    onCostPriceChange,
    applyTax = false,
    forceTaxIncluded = false,
    pricingTiers = [],
    isBackup = false,
    errors
}: PricingSectionProps) {
    const { tooltips } = usePage<PageProps>().props
    const [hasWholesale, setHasWholesale] = useState(!!wholesalePrice || pricingTiers.length > 0)
    const [tiers, setTiers] = useState<PricingTier[]>(
        pricingTiers.length > 0 ? pricingTiers : []
    )
    const [retailValue, setRetailValue] = useState<number | undefined>(retailPrice ?? 0)
    const [wholesaleValue, setWholesaleValue] = useState<number | undefined>(wholesalePrice ?? 0)
    const [costValue, setCostValue] = useState<number | undefined>(costPrice ?? 0)
    const [price6hValue, setPrice6hValue] = useState<number | undefined>(price6h ?? 0)
    const [price1dValue, setPrice1dValue] = useState<number | undefined>(price1d ?? 0)
    const [price3dValue, setPrice3dValue] = useState<number | undefined>(price3d ?? 0)
    const [price7dValue, setPrice7dValue] = useState<number | undefined>(price7d ?? 0)
    const [depositValue, setDepositValue] = useState<string>(deposit ?? '')
    const [taxEnabled, setTaxEnabled] = useState(applyTax)
    const [isBackupMachine, setIsBackupMachine] = useState(isBackup)

    // Sync from props when editing / demo loading
    useEffect(() => {
        setRetailValue(retailPrice ?? 0)
    }, [retailPrice])

    useEffect(() => {
        setWholesaleValue(wholesalePrice ?? 0)
        setHasWholesale(!!wholesalePrice || (pricingTiers?.length ?? 0) > 0)
    }, [wholesalePrice, pricingTiers])

    useEffect(() => {
        setCostValue(costPrice ?? 0)
    }, [costPrice])

    useEffect(() => {
        setTiers(pricingTiers?.length ? pricingTiers : [])
    }, [pricingTiers])

    useEffect(() => {
        setPrice6hValue(price6h ?? 0)
    }, [price6h])

    useEffect(() => {
        setPrice1dValue(price1d ?? 0)
    }, [price1d])

    useEffect(() => {
        setPrice3dValue(price3d ?? 0)
    }, [price3d])

    useEffect(() => {
        setPrice7dValue(price7d ?? 0)
    }, [price7d])

    useEffect(() => {
        setDepositValue(deposit ?? '')
    }, [deposit])

    useEffect(() => {
        setIsBackupMachine(!!isBackup)
    }, [isBackup])

    useEffect(() => {
        if (forceTaxIncluded) {
            setTaxEnabled(true)
        } else {
            setTaxEnabled(!!applyTax)
        }
    }, [applyTax, forceTaxIncluded])

    const addTier = () => {
        const lastTier = tiers[tiers.length - 1]
        const newMin = lastTier ? (lastTier.max_quantity || lastTier.min_quantity) + 1 : 2
        setTiers([...tiers, { min_quantity: newMin, max_quantity: null, price: 0 }])
    }

    const removeTier = (index: number) => {
        setTiers(tiers.filter((_, i) => i !== index))
    }

    const updateTier = <K extends keyof PricingTier>(index: number, field: K, value: PricingTier[K]) => {
        const newTiers = [...tiers]
        newTiers[index] = { ...newTiers[index], [field]: value }
        setTiers(newTiers)
    }

    const tierConflicts = useMemo(() => {
        const conflicts: number[] = []
        for (let i = 0; i < tiers.length; i++) {
            for (let j = i + 1; j < tiers.length; j++) {
                const a = tiers[i]
                const b = tiers[j]
                const aMax = a.max_quantity ?? Infinity
                const bMax = b.max_quantity ?? Infinity
                if (a.min_quantity <= bMax && b.min_quantity <= aMax) {
                    if (!conflicts.includes(i)) conflicts.push(i)
                    if (!conflicts.includes(j)) conflicts.push(j)
                }
            }
        }
        return conflicts
    }, [tiers])

    const renderTooltip = (text: string | undefined) => {
        if (!text) return null
        return (
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help inline-block ml-1" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-slate-900 text-white border-slate-900">
                        <p>{text}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
                {/* Price 6h */}
                <div className="col-span-1">
                    <div className="flex items-center mb-2">
                        <Label htmlFor="price_6h">Giá thuê 6h</Label>
                    </div>
                    <PriceInput
                        id="price_6h"
                        name="price_6h"
                        value={price6hValue}
                        onValueChange={setPrice6hValue}
                        placeholder="0"
                    />
                </div>

                {/* Price 1d */}
                <div className="col-span-1">
                    <div className="flex items-center mb-2">
                        <Label htmlFor="price_1d">Giá thuê 1 ngày</Label>
                    </div>
                    <PriceInput
                        id="price_1d"
                        name="price_1d"
                        value={price1dValue}
                        onValueChange={setPrice1dValue}
                        placeholder="0"
                    />
                </div>

                {/* Price 3d */}
                <div className="col-span-1">
                    <div className="flex items-center mb-2">
                        <Label htmlFor="price_3d">Giá thuê 3 ngày</Label>
                    </div>
                    <PriceInput
                        id="price_3d"
                        name="price_3d"
                        value={price3dValue}
                        onValueChange={setPrice3dValue}
                        placeholder="0"
                    />
                </div>

                {/* Price 7d */}
                <div className="col-span-1">
                    <div className="flex items-center mb-2">
                        <Label htmlFor="price_7d">Giá thuê 7 ngày</Label>
                    </div>
                    <PriceInput
                        id="price_7d"
                        name="price_7d"
                        value={price7dValue}
                        onValueChange={setPrice7dValue}
                        placeholder="0"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* Cost Price */}
                <div className="col-span-1">
                    <div className="flex items-center mb-2">
                        <Label htmlFor="cost_price">Giá nhập máy (để tính hòa vốn)</Label>
                    </div>
                    <PriceInput
                        id="cost_price"
                        name="cost_price"
                        value={costValue}
                        onValueChange={(val) => {
                            setCostValue(val);
                            onCostPriceChange?.(val);
                        }}
                        placeholder="0"
                    />
                </div>

                {/* Backup Machine Switch */}
                <div className="col-span-1">
                    <div className="flex items-center mb-2">
                        <Label htmlFor="is_backup" className="text-amber-600 font-bold">Cài đặt máy</Label>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-amber-50/50 border border-amber-100 rounded-lg shadow-sm h-11">
                        <div className="flex items-center gap-1.5 flex-1">
                            <Label htmlFor="is_backup" className="text-xs font-bold text-amber-900 cursor-pointer">Máy dự phòng</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="w-3.5 h-3.5 text-amber-400 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[200px] text-[10px]">
                                        <p>Đánh dấu nếu đây là máy dự phòng. Máy dự phòng sẽ có màu vàng trên Lịch Máy.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Switch 
                            id="is_backup" 
                            name="is_backup" 
                            checked={isBackupMachine}
                            onCheckedChange={setIsBackupMachine}
                            className="data-[state=checked]:bg-amber-500"
                        />
                    </div>
                </div>
            </div>

            {/* Deposit Section */}
            <div>
                <Label htmlFor="deposit" className="mb-2 block">Thông tin cọc</Label>
                <Textarea
                    id="deposit"
                    name="deposit"
                    value={depositValue}
                    onChange={(e) => setDepositValue(e.target.value)}
                    placeholder="Nhập điều kiện cọc, giấy tờ cần thiết..."
                    className="min-h-[100px]"
                />
            </div>

            <div className="hidden">
                <PriceInput
                    name="retail_price"
                    value={retailValue}
                    onValueChange={setRetailValue}
                />
            </div>

            {/* Visual spacer for layout */}

            {/* Hidden tax and wholesale fields to keep it clean as requested */}
            <div className="hidden">
                <Checkbox
                    id="has_wholesale"
                    checked={hasWholesale}
                    onCheckedChange={(checked) => setHasWholesale(checked as boolean)}
                />
                <Switch
                    id="apply_tax"
                    checked={taxEnabled}
                    onCheckedChange={setTaxEnabled}
                />
            </div>

            {/* Hidden inputs */}
            <input type="hidden" name="retail_price" value={retailValue || 0} />
            <input type="hidden" name="wholesale_price" value={hasWholesale ? (wholesaleValue ?? 0) : 0} />
            <input type="hidden" name="cost_price" value={costValue ?? 0} />
            <input type="hidden" name="price_6h" value={price6hValue || 0} />
            <input type="hidden" name="price_1d" value={price1dValue || 0} />
            <input type="hidden" name="price_3d" value={price3dValue || 0} />
            <input type="hidden" name="price_7d" value={price7dValue || 0} />
            <input type="hidden" name="deposit" value={depositValue} />
            <input type="hidden" name="apply_tax" value={(forceTaxIncluded || taxEnabled) ? '1' : '0'} />
            <input type="hidden" name="is_backup" value={isBackupMachine ? '1' : '0'} />

            {/* CRITICAL FIX: Always submit pricing_tiers to allow deletion when unchecked */}
            {!hasWholesale && (
                <input type="hidden" name="pricing_tiers" value={JSON.stringify([])} />
            )}
        </div>
    )
}
