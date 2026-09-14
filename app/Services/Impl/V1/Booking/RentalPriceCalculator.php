<?php

namespace App\Services\Impl\V1\Booking;

use App\Models\Product;
use Carbon\Carbon;

/**
 * Tinh tien thue may theo bang cong thuc cua cua hang.
 *
 * Quy tac (theo bang viet tay khach dua):
 *   - Mot ngay duong lich dung 2 hoac 3 ca  -> tinh 1 ngay
 *     (thue ca Sang + Chieu + Toi trong cung mot ngay van chi la 1 ngay)
 *   - Mot ngay duong lich dung dung 1 ca    -> tinh 1 buoi
 *   - Hai buoi le trong cung mot dot thue   -> ghep lai thanh 1 ngay
 * Noi cach khac: mot ngay duong lich khong bao gio bi tinh qua 1 ngay tien.
 *
 * Doi chieu voi bang cua cua hang (ngay 12 va 13):
 *   Sang -> Toi   (cung ngay)  = 1 ngay
 *   Sang -> Chieu (cung ngay)  = 1 ngay
 *   Chieu -> Toi  (cung ngay)  = 1 ngay
 *   Toi 12 -> Sang 13          = 1 ngay
 *   Toi 12 -> Chieu 13         = 1 ngay + 1 buoi
 *   Toi 12 -> Toi 13           = 1 ngay + 1 buoi
 *   Chieu 12 -> Chieu 13       = 2 ngay
 *
 * Day la ban PHP dung song song voi ban TypeScript trong
 * resources/js/components/booking/booking-form-modal.tsx. Sua mot ben thi phai
 * sua ca ben kia - co bo test tai tests/Unit/RentalPriceCalculatorTest.php khoa
 * lai bang cong thuc tren.
 */
class RentalPriceCalculator
{
    public const SLOTS = ['S', 'C', 'T'];

    /**
     * Quy mot ca ve so nguyen tang dan: ngay N co cac ca 3N, 3N+1, 3N+2.
     *
     * Dung gmmktime (goc UTC) chu khong dung timestamp theo mui gio may chu:
     * o mui gio lech am, nua dem dia phuong roi vao ngay hom truoc theo UTC nen
     * phep chia cho 86400 se lam lech so ngay, va o mui gio co gio mua thi do
     * lech con thay doi giua mua he va mua dong - tuc la mot ky thue vat qua moc
     * doi gio se bi dem sai so ngay.
     */
    public static function slotValue(string $date, string $slot): int
    {
        $d = Carbon::parse($date);
        $days = (int) floor(gmmktime(0, 0, 0, (int) $d->month, (int) $d->day, (int) $d->year) / 86400);
        $offset = array_search($slot, self::SLOTS, true);

        return $days * 3 + ($offset === false ? 0 : $offset);
    }

    /**
     * Bung cac ky thue thanh danh sach ca (da bo trung, da sap xep).
     *
     * @param  array<int,array{startDate:string,startSlot:string,endDate:string,endSlot:string}>  $periods
     * @return array<int,int>
     */
    public static function expand(array $periods): array
    {
        $all = [];

        foreach ($periods as $p) {
            if (empty($p['startDate']) || empty($p['endDate'])) {
                continue;
            }

            $start = self::slotValue($p['startDate'], $p['startSlot'] ?? 'S');
            $end = self::slotValue($p['endDate'], $p['endSlot'] ?? 'S');

            // Ca ket thuc nam truoc ca bat dau -> ky thue khong hop le, bo qua.
            if ($end < $start) {
                continue;
            }

            for ($i = $start; $i <= $end; $i++) {
                $all[$i] = true;
            }
        }

        $slots = array_keys($all);
        sort($slots);

        return $slots;
    }

    /**
     * Tinh tien cho mot may va cac ky thue.
     *
     * @param  array<int,array{startDate:string,startSlot:string,endDate:string,endSlot:string}>  $periods
     * @return array{total:float,days:int,half_days:int}
     */
    public function calculate(Product $product, array $periods): array
    {
        return $this->calculateFromPrices([
            'price_6h' => (float) ($product->price_6h ?? 0),
            'price_1d' => (float) ($product->price_1d ?? 0),
            'price_3d' => (float) ($product->price_3d ?? 0),
            'price_7d' => (float) ($product->price_7d ?? 0),
        ], $periods);
    }

    /**
     * Phan tinh thuan tuy, khong dinh gi den model hay CSDL.
     *
     * @param  array{price_6h:float,price_1d:float,price_3d:float,price_7d:float}  $prices
     * @param  array<int,array{startDate:string,startSlot:string,endDate:string,endSlot:string}>  $periods
     * @return array{total:float,days:int,half_days:int}
     */
    public function calculateFromPrices(array $prices, array $periods): array
    {
        $p6h = (float) ($prices['price_6h'] ?? 0);
        $p1d = (float) ($prices['price_1d'] ?? 0);
        $p3d = (float) ($prices['price_3d'] ?? 0);
        $p7d = (float) ($prices['price_7d'] ?? 0);

        $slots = self::expand($periods);

        if ($slots === []) {
            return ['total' => 0.0, 'days' => 0, 'half_days' => 0];
        }

        $total = 0.0;
        $tongNgay = 0;
        $tongBuoi = 0;

        foreach (self::blocks($slots) as $block) {
            // Dem so ca cua tung ngay duong lich trong dot thue lien mach nay.
            $soCaMoiNgay = [];
            foreach ($block as $slotValue) {
                // floor chu khong phai intdiv: intdiv cat ve phia 0 con Math.floor
                // ben ban TypeScript lam tron xuong, hai ham chi khac nhau o so am
                // nhung de vay thi hai ban co the lech nhau - khong de cua lai.
                $ngay = (int) floor($slotValue / 3);
                $soCaMoiNgay[$ngay] = ($soCaMoiNgay[$ngay] ?? 0) + 1;
            }

            $billedDays = 0;
            $buoiLe = 0;
            foreach ($soCaMoiNgay as $soCa) {
                if ($soCa >= 2) {
                    $billedDays++;
                } else {
                    $buoiLe++;
                }
            }

            // Mot khoi lien mach chi co the le o ngay dau va ngay cuoi -> buoiLe <= 2.
            $billedDays += intdiv($buoiLe, 2);
            $buoiConLai = $buoiLe % 2;

            $tongNgay += $billedDays;
            $tongBuoi += $buoiConLai;

            if ($billedDays === 0) {
                // Ca khoi chi co dung 1 ca.
                $total += $p6h;
                continue;
            }

            // p7d/p3d bang 0 nghia la may CHUA dat muc gia do -> lui ve muc co gia.
            if ($billedDays >= 7) {
                $rate = $p7d ?: ($p3d ?: $p1d);
            } elseif ($billedDays >= 3) {
                $rate = $p3d ?: $p1d;
            } else {
                $rate = $p1d;
            }

            $total += $billedDays * $rate;

            if ($buoiConLai) {
                $total += $p6h;
            }
        }

        return ['total' => $total, 'days' => $tongNgay, 'half_days' => $tongBuoi];
    }

    /**
     * Cat danh sach ca da sap xep thanh cac doan lien mach.
     *
     * @param  array<int,int>  $slots
     * @return array<int,array<int,int>>
     */
    private static function blocks(array $slots): array
    {
        $blocks = [];
        $current = [];

        foreach ($slots as $s) {
            if ($current === [] || $s === $current[count($current) - 1] + 1) {
                $current[] = $s;
            } else {
                $blocks[] = $current;
                $current = [$s];
            }
        }

        if ($current !== []) {
            $blocks[] = $current;
        }

        return $blocks;
    }
}
