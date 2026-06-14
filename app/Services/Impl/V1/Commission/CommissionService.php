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

        // Commission for the current month
        $currentMonthPaid = (float) $this->getFilteredQuery($request)
            ->whereYear('created_at', now()->year)
            ->whereMonth('created_at', now()->month)
            ->sum('commission_amount');

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
}
