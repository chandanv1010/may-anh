<?php

namespace Tests\Unit;

use App\Services\Impl\V1\Booking\RentalPriceCalculator;
use PHPUnit\Framework\TestCase;

/**
 * Khoa cong thuc tinh tien thue theo dung bang viet tay cua cua hang.
 *
 * Khong dung Tests\TestCase / RefreshDatabase: bo tinh toan nay thuan tuy, khong
 * cham CSDL, nen test chay duoc ngay ca khi may chua dung MySQL test.
 */
class RentalPriceCalculatorTest extends TestCase
{
    /** Gia may dung cho moi phep thu, chon so tron de de doi chieu bang tay. */
    private function may(array $ghiDe = []): array
    {
        return [
            'price_6h' => $ghiDe['price_6h'] ?? 100000,
            'price_1d' => $ghiDe['price_1d'] ?? 200000,
            'price_3d' => $ghiDe['price_3d'] ?? 180000,
            'price_7d' => $ghiDe['price_7d'] ?? 170000,
        ];
    }

    private function ky(string $sCa, string $sNgay, string $eCa, string $eNgay): array
    {
        return [[
            'startSlot' => $sCa, 'startDate' => $sNgay,
            'endSlot' => $eCa, 'endDate' => $eNgay,
        ]];
    }

    /**
     * Bang cong thuc khach dua, tung dong mot.
     *
     * @return array<string,array{0:string,1:string,2:string,3:string,4:int,5:int}>
     */
    public static function bangCongThuc(): array
    {
        return [
            // [ca bat dau, ngay bat dau, ca ket thuc, ngay ket thuc, so ngay, so buoi]
            'Sang -> Toi cung ngay'   => ['S', '2026-08-12', 'T', '2026-08-12', 1, 0],
            'Sang -> Chieu cung ngay' => ['S', '2026-08-12', 'C', '2026-08-12', 1, 0],
            'Chieu -> Toi cung ngay'  => ['C', '2026-08-12', 'T', '2026-08-12', 1, 0],
            'Toi 12 -> Sang 13'       => ['T', '2026-08-12', 'S', '2026-08-13', 1, 0],
            'Toi 12 -> Chieu 13'      => ['T', '2026-08-12', 'C', '2026-08-13', 1, 1],
            'Toi 12 -> Toi 13'        => ['T', '2026-08-12', 'T', '2026-08-13', 1, 1],
            'Chieu 12 -> Chieu 13'    => ['C', '2026-08-12', 'C', '2026-08-13', 2, 0],
        ];
    }

    /**
     * @dataProvider bangCongThuc
     */
    public function test_khop_bang_cong_thuc_cua_cua_hang(
        string $sCa, string $sNgay, string $eCa, string $eNgay, int $ngay, int $buoi
    ): void {
        $calc = new RentalPriceCalculator();
        $ket = $calc->calculateFromPrices($this->may(), $this->ky($sCa, $sNgay, $eCa, $eNgay));

        $this->assertSame($ngay, $ket['days'], 'so ngay tinh tien');
        $this->assertSame($buoi, $ket['half_days'], 'so buoi le');
        $this->assertEqualsWithDelta($ngay * 200000 + $buoi * 100000, $ket['total'], 0.01);
    }

    public function test_mot_ca_duy_nhat_tinh_gia_6h(): void
    {
        $ket = (new RentalPriceCalculator())->calculateFromPrices($this->may(), $this->ky('S', '2026-08-12', 'S', '2026-08-12'));

        // Mot ca le van la "1 buoi": days = 0, half_days = 1, tinh gia 6h.
        $this->assertSame(0, $ket['days']);
        $this->assertSame(1, $ket['half_days']);
        $this->assertEqualsWithDelta(100000, $ket['total'], 0.01);
    }

    public function test_tu_3_ngay_dung_gia_3_ngay(): void
    {
        // Sang 12 -> Toi 14 = 3 ngay tron.
        $ket = (new RentalPriceCalculator())->calculateFromPrices($this->may(), $this->ky('S', '2026-08-12', 'T', '2026-08-14'));

        $this->assertSame(3, $ket['days']);
        $this->assertEqualsWithDelta(3 * 180000, $ket['total'], 0.01);
    }

    public function test_tu_7_ngay_dung_gia_7_ngay(): void
    {
        // Sang 12 -> Toi 18 = 7 ngay tron.
        $ket = (new RentalPriceCalculator())->calculateFromPrices($this->may(), $this->ky('S', '2026-08-12', 'T', '2026-08-18'));

        $this->assertSame(7, $ket['days']);
        $this->assertEqualsWithDelta(7 * 170000, $ket['total'], 0.01);
    }

    public function test_may_chua_dat_gia_7_ngay_thi_lui_ve_gia_3_ngay(): void
    {
        $may = $this->may(['price_7d' => 0]);
        $ket = (new RentalPriceCalculator())->calculateFromPrices($may, $this->ky('S', '2026-08-12', 'T', '2026-08-18'));

        $this->assertEqualsWithDelta(7 * 180000, $ket['total'], 0.01);
    }

    public function test_hai_dot_thue_roi_nhau_tinh_rieng_tung_dot(): void
    {
        // Hai buoi le o hai dot cach xa nhau thi KHONG duoc ghep thanh 1 ngay.
        $periods = [
            ['startSlot' => 'S', 'startDate' => '2026-08-12', 'endSlot' => 'S', 'endDate' => '2026-08-12'],
            ['startSlot' => 'S', 'startDate' => '2026-08-20', 'endSlot' => 'S', 'endDate' => '2026-08-20'],
        ];

        $ket = (new RentalPriceCalculator())->calculateFromPrices($this->may(), $periods);

        $this->assertSame(0, $ket['days']);
        $this->assertEqualsWithDelta(2 * 100000, $ket['total'], 0.01);
    }

    public function test_hai_dot_lien_nhau_duoc_gop_thanh_mot(): void
    {
        // Sang-Chieu 12 va Toi 12 la lien mach -> 3 ca cung ngay = 1 ngay.
        $periods = [
            ['startSlot' => 'S', 'startDate' => '2026-08-12', 'endSlot' => 'C', 'endDate' => '2026-08-12'],
            ['startSlot' => 'T', 'startDate' => '2026-08-12', 'endSlot' => 'T', 'endDate' => '2026-08-12'],
        ];

        $ket = (new RentalPriceCalculator())->calculateFromPrices($this->may(), $periods);

        $this->assertSame(1, $ket['days']);
        $this->assertEqualsWithDelta(200000, $ket['total'], 0.01);
    }

    public function test_ky_thue_nguoc_bi_bo_qua_thay_vi_tinh_bay(): void
    {
        // "Toi 12/8 -> Sang 12/8" la vo nghia; phai ra 0 chu khong duoc tinh lung tung.
        $ket = (new RentalPriceCalculator())->calculateFromPrices($this->may(), $this->ky('T', '2026-08-12', 'S', '2026-08-12'));

        $this->assertEqualsWithDelta(0, $ket['total'], 0.01);
    }

    public function test_ca_trung_nhau_giua_hai_dot_chi_tinh_mot_lan(): void
    {
        $periods = [
            ['startSlot' => 'S', 'startDate' => '2026-08-12', 'endSlot' => 'T', 'endDate' => '2026-08-12'],
            ['startSlot' => 'C', 'startDate' => '2026-08-12', 'endSlot' => 'T', 'endDate' => '2026-08-12'],
        ];

        $ket = (new RentalPriceCalculator())->calculateFromPrices($this->may(), $periods);

        $this->assertSame(1, $ket['days']);
        $this->assertEqualsWithDelta(200000, $ket['total'], 0.01);
    }

    public function test_khong_le_thuoc_mui_gio_cua_may_chay(): void
    {
        $cu = date_default_timezone_get();

        try {
            foreach (['UTC', 'Asia/Ho_Chi_Minh', 'America/New_York'] as $tz) {
                date_default_timezone_set($tz);
                $ket = (new RentalPriceCalculator())->calculateFromPrices(
                    $this->may(), $this->ky('C', '2026-08-12', 'C', '2026-08-13')
                );
                $this->assertSame(2, $ket['days'], 'sai o mui gio ' . $tz);
            }
        } finally {
            date_default_timezone_set($cu);
        }
    }
}
