<?php

namespace App\Services\Impl\V1\Commission;

use App\Models\BookingOrder;
use App\Models\CommissionHistory;
use App\Models\User;
use App\Services\Interfaces\CommissionServiceInterface;
use App\Services\Interfaces\Setting\SystemServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CommissionService implements CommissionServiceInterface
{
    /**
     * Calculate and save commission for an order.
     */
    public function calculate(BookingOrder $order): bool
    {
        if (!$order->staff_chot_id) {
            Log::info("CommissionService: Order #{$order->id} does not have staff_chot_id. Skipping.");
            return false;
        }

        $creator = User::with('user_catalogues')->find($order->staff_chot_id);
        if (!$creator) {
            Log::warning("CommissionService: Creator User #{$order->staff_chot_id} not found for Order #{$order->id}");
            return false;
        }

        // Check if commission was already calculated for this order to prevent duplicates
        $exists = CommissionHistory::where('booking_order_id', $order->id)
            ->where('status', 'active')
            ->exists();
        if ($exists) {
            Log::info("CommissionService: Commission already active for Order #{$order->id}. Skipping.");
            return false;
        }

        DB::transaction(function () use ($order, $creator) {
            // 1. Calculate Creator's Commission
            $creatorRate = (float) $creator->user_catalogues->max('commission_rate');
            $creatorCommission = $order->final_amount * ($creatorRate / 100);

            if ($creatorCommission > 0) {
                CommissionHistory::create([
                    'booking_order_id' => $order->id,
                    'user_id' => $creator->id,
                    'received_from_user_id' => null, // Own order
                    'type' => 'creator',
                    'order_amount' => $order->final_amount,
                    'commission_rate' => $creatorRate,
                    'commission_amount' => $creatorCommission,
                    'status' => 'active',
                    'description' => "Nhận hoa hồng tự tạo đơn hàng #{$order->id} (Tỉ lệ {$creatorRate}%)",
                ]);
            }

            // 2. Calculate Manager's Commission
            if ($creator->parent_id) {
                $manager = User::find($creator->parent_id);
                if ($manager) {
                    $systemService = app(SystemServiceInterface::class);
                    $config = $systemService->getAllConfig();
                    $managerRate = isset($config['manager_commission_rate']) ? (float)$config['manager_commission_rate'] : 0.0;
                    $managerCommission = $order->final_amount * ($managerRate / 100);

                    if ($managerCommission > 0) {
                        CommissionHistory::create([
                            'booking_order_id' => $order->id,
                            'user_id' => $manager->id,
                            'received_from_user_id' => $creator->id, // Subordinate
                            'type' => 'manager',
                            'order_amount' => $order->final_amount,
                            'commission_rate' => $managerRate,
                            'commission_amount' => $managerCommission,
                            'status' => 'active',
                            'description' => "Nhận hoa hồng quản lý từ đơn hàng #{$order->id} của cấp dưới {$creator->name} (Tỉ lệ {$managerRate}%)",
                        ]);
                    }
                }
            }
        });

        return true;
    }

    /**
     * Revert / refund commission when an order is cancelled or status changes.
     */
    public function refund(BookingOrder $order): bool
    {
        $activeCommissions = CommissionHistory::where('booking_order_id', $order->id)
            ->where('status', 'active')
            ->get();

        if ($activeCommissions->isEmpty()) {
            return false;
        }

        DB::transaction(function () use ($order, $activeCommissions) {
            foreach ($activeCommissions as $commission) {
                // Insert reversal negative record
                CommissionHistory::create([
                    'booking_order_id' => $commission->booking_order_id,
                    'user_id' => $commission->user_id,
                    'received_from_user_id' => $commission->received_from_user_id,
                    'type' => $commission->type,
                    'order_amount' => $commission->order_amount,
                    'commission_rate' => $commission->commission_rate,
                    'commission_amount' => -$commission->commission_amount, // Negative
                    'status' => 'active', // The refund transaction is active
                    'description' => "Hoàn trả hoa hồng đơn hàng #{$order->id} do hủy đơn",
                ]);

                // Mark original record as refunded
                $commission->update(['status' => 'refunded']);
            }
        });

        return true;
    }

    /**
     * Get commission histories query with filters based on user role.
     */
    protected function getFilteredQuery(Request $request)
    {
        $user = Auth::user();
        $query = CommissionHistory::query();

        // 1. Role-based restrictions
        if ($user->isSuperAdmin()) {
            // Superadmin can see all, apply user filter if requested
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->input('user_id'));
            }
        } else {
            // Check if user is a manager
            $subordinateIds = User::where('parent_id', $user->id)->pluck('id')->toArray();
            
            if (count($subordinateIds) > 0) {
                // User is a manager. They can see themselves and subordinates
                $allowedIds = array_merge([$user->id], $subordinateIds);
                if ($request->filled('user_id') && in_array((int)$request->input('user_id'), $allowedIds)) {
                    $query->where('user_id', $request->input('user_id'));
                } else {
                    $query->whereIn('user_id', $allowedIds);
                }
            } else {
                // Normal user, can only see themselves
                $query->where('user_id', $user->id);
            }
        }

        // 2. Month filter
        if ($request->filled('month')) {
            try {
                [$year, $month] = explode('-', $request->input('month'));
                $query->whereYear('created_at', $year)
                      ->whereMonth('created_at', $month);
            } catch (\Exception $e) {
                Log::warning("CommissionService: Invalid month format " . $request->input('month'));
            }
        }

        return $query;
    }

    /**
     * Get commission histories with filters based on user role.
     */
    public function getHistory(Request $request)
    {
        $query = $this->getFilteredQuery($request);
        
        return $query->with(['user', 'receivedFrom', 'bookingOrder'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);
    }

    /**
     * Get commission statistics based on user role.
     */
    public function getStatistics(Request $request): array
    {
        $query = $this->getFilteredQuery($request);

        // Sum of all commission amounts (net paid, including negative reversals)
        $totalPaid = (float) $query->sum('commission_amount');

        // Hoa hồng của tháng đang xem.
        //
        // Trước đây chỗ này lấy query ĐÃ lọc theo tháng người dùng chọn rồi lọc
        // chồng thêm tháng hiện tại, nên chọn tháng 8 trong khi đang là tháng 9
        // thì hai điều kiện loại trừ nhau và ô này luôn ra 0đ - đúng vào lúc cần
        // nhất là khi trả hoa hồng của tháng trước.
        $thangDangXem = $request->input('month');
        if ($thangDangXem) {
            // getFilteredQuery đã lọc đúng tháng đó rồi, không lọc thêm nữa.
            $currentMonthPaid = $totalPaid;
        } else {
            $currentMonthPaid = (float) $this->getFilteredQuery($request)
                ->whereYear('created_at', now()->year)
                ->whereMonth('created_at', now()->month)
                ->sum('commission_amount');
        }

        // Distinct orders that received positive commission
        $ordersCount = $this->getFilteredQuery($request)
            ->where('commission_amount', '>', 0)
            ->distinct('booking_order_id')
            ->count('booking_order_id');

        return [
            'total_paid' => $totalPaid,
            'current_month_paid' => $currentMonthPaid,
            'orders_count' => $ordersCount,
        ];
    }

    /**
     * Những người có chốt đơn hoàn tất nhưng nhóm của họ chưa đặt tỉ lệ hoa hồng.
     *
     * Hoa hồng chỉ được ghi khi số tiền tính ra lớn hơn 0, nên người chưa gán
     * nhóm (hoặc nhóm để tỉ lệ 0%) sẽ KHÔNG có bản ghi nào và biến mất khỏi bảng
     * tổng hợp - chủ cửa hàng không có cách nào nhận ra là đang sót người.
     *
     * @return array<int,array{name:string,orders_count:int,revenue:float}>
     */
    public function getUsersMissingRate(): array
    {
        $rows = BookingOrder::query()
            ->where('status', 'finished')
            ->whereNotNull('staff_chot_id')
            ->selectRaw('staff_chot_id, COUNT(*) as so_don, SUM(final_amount) as doanh_thu')
            ->groupBy('staff_chot_id')
            ->get();

        $ra = [];

        foreach ($rows as $r) {
            $u = User::with('user_catalogues')->find($r->staff_chot_id);
            if (!$u) {
                continue;
            }

            if ((float) $u->user_catalogues->max('commission_rate') > 0) {
                continue;
            }

            $ra[] = [
                'name' => $u->name,
                'orders_count' => (int) $r->so_don,
                'revenue' => (float) $r->doanh_thu,
            ];
        }

        usort($ra, fn($a, $b) => $b['revenue'] <=> $a['revenue']);

        return $ra;
    }

    /**
     * Bảng tổng hợp theo từng người: số đơn, doanh thu, tỉ lệ, tiền hoa hồng.
     *
     * Đây là bảng dùng để trả tiền cuối tháng: chọn tháng một lần là thấy đủ
     * mọi người, thay vì phải lọc lần lượt từng thành viên rồi cộng tay.
     *
     * Cách cộng trừ - hai điểm dễ sai nếu gộp bằng SQL:
     *  1. Khi huỷ đơn, hệ thống KHÔNG xoá bản ghi cũ mà thêm một bản ghi âm và
     *     đánh dấu bản ghi gốc là 'refunded'. Vì vậy phải cộng TẤT CẢ trạng thái
     *     thì cặp (+X gốc, -X hoàn) mới triệt tiêu về 0. Nếu chỉ lấy 'active'
     *     thì còn mỗi bản ghi âm và ra số âm.
     *  2. Một đơn có cấp quản lý sẽ sinh HAI bản ghi (creator + manager). Doanh
     *     thu chỉ được tính trên bản ghi 'creator', nếu không sẽ đếm đôi.
     *
     * @return array<int,array<string,mixed>>
     */
    public function getSummaryByUser(Request $request): array
    {
        $rows = $this->getFilteredQuery($request)->with('user')->get();

        $theoNguoi = [];

        foreach ($rows as $r) {
            $uid = $r->user_id;

            if (!isset($theoNguoi[$uid])) {
                $theoNguoi[$uid] = [
                    'user_id' => $uid,
                    'name' => $r->user->name ?? ('#' . $uid),
                    'email' => $r->user->email ?? '',
                    'revenue' => 0.0,
                    'commission' => 0.0,
                    'commission_creator' => 0.0,
                    'commission_manager' => 0.0,
                    'rate' => 0.0,
                    '_orders' => [],
                ];
            }

            $tien = (float) $r->commission_amount;
            $dau = $tien < 0 ? -1 : 1;

            $theoNguoi[$uid]['commission'] += $tien;

            if ($r->type === 'manager') {
                $theoNguoi[$uid]['commission_manager'] += $tien;
                continue;
            }

            $theoNguoi[$uid]['commission_creator'] += $tien;
            $theoNguoi[$uid]['revenue'] += $dau * (float) $r->order_amount;
            $theoNguoi[$uid]['rate'] = max($theoNguoi[$uid]['rate'], (float) $r->commission_rate);

            $oid = $r->booking_order_id;
            $theoNguoi[$uid]['_orders'][$oid] = ($theoNguoi[$uid]['_orders'][$oid] ?? 0) + $dau;
        }

        // Đơn đã hoàn lại thì cặp +1/-1 triệt tiêu, không tính vào số đơn.
        foreach ($theoNguoi as $uid => $d) {
            $theoNguoi[$uid]['orders_count'] = count(array_filter($d['_orders'], fn($n) => $n > 0));
            unset($theoNguoi[$uid]['_orders']);
        }

        usort($theoNguoi, fn($a, $b) => $b['commission'] <=> $a['commission']);

        return array_values($theoNguoi);
    }
}
