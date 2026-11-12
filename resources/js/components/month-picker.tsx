import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Chon thang dang 'YYYY-MM' ('' = tat ca thoi gian).
 *
 * Thay cho <input type="month">: tren Firefox/Safari o do hien thanh o chu tron
 * khong co lich de bam, con tren Chrome phai bam dung bieu tuong lich nho moi chon
 * duoc - nhan vien khong loc duoc thang. Hai o select + nut lui/tien thi trinh
 * duyet nao cung giong nhau va bam mot lan la xong.
 */
interface MonthPickerProps {
    value: string;
    onChange: (value: string) => void;
    /** Cho phep chon "Tat ca" (gia tri ''). */
    allowAll?: boolean;
    firstYear?: number;
    id?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

const thangHienTai = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export default function MonthPicker({ value, onChange, allowAll = true, firstYear = 2026, id }: MonthPickerProps) {
    const [y, m] = value ? value.split('-').map(Number) : [0, 0];
    const namNay = new Date().getFullYear();
    const cacNam: number[] = [];
    for (let n = Math.min(firstYear, y || namNay); n <= Math.max(namNay + 1, y || 0); n++) cacNam.push(n);

    // Lui/tien mot thang. Dang o "Tat ca" thi bat dau tu thang hien tai.
    const dich = (buoc: number) => {
        const [yy, mm] = (value || thangHienTai()).split('-').map(Number);
        const d = new Date(yy, mm - 1 + (value ? buoc : 0), 1);
        onChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    };

    const nut = 'h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer';
    const hop = 'h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer';

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <button type="button" className={nut} onClick={() => dich(-1)} aria-label="Tháng trước">
                <ChevronLeft className="h-4 w-4" />
            </button>
            <select
                id={id}
                value={value ? String(m) : ''}
                onChange={(e) => {
                    const t = e.target.value;
                    if (!t) return onChange('');
                    onChange(`${y || namNay}-${pad(Number(t))}`);
                }}
                className={`${hop} flex-1 min-w-[110px]`}
                aria-label="Tháng"
            >
                {allowAll && <option value="">Tất cả các tháng</option>}
                {Array.from({ length: 12 }, (_, i) => i + 1).map((t) => (
                    <option key={t} value={t}>
                        Tháng {t}
                    </option>
                ))}
            </select>
            <select
                value={value ? String(y) : ''}
                disabled={!value}
                onChange={(e) => onChange(`${e.target.value}-${pad(m || new Date().getMonth() + 1)}`)}
                className={`${hop} w-[84px] disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label="Năm"
            >
                {!value && <option value="">Năm</option>}
                {cacNam.map((n) => (
                    <option key={n} value={n}>
                        {n}
                    </option>
                ))}
            </select>
            <button type="button" className={nut} onClick={() => dich(1)} aria-label="Tháng sau">
                <ChevronRight className="h-4 w-4" />
            </button>
            {value !== thangHienTai() && (
                <button
                    type="button"
                    onClick={() => onChange(thangHienTai())}
                    className="h-9 px-2.5 rounded-md text-xs font-semibold text-blue-600 hover:bg-blue-50 cursor-pointer whitespace-nowrap"
                >
                    Tháng này
                </button>
            )}
        </div>
    );
}
