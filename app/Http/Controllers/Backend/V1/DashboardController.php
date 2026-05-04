<?php

namespace App\Http\Controllers\Backend\V1;

use App\Http\Controllers\Backend\BaseController;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends BaseController
{
    use AuthorizesRequests;

    public function __construct()
    {
        parent::__construct(null);
    }

    /**
     * Hiển thị trang dashboard chính
     *
     * @return Response
     */
    public function index(): Response
    {
        $user = auth()->user();
        if (!$user->isSuperAdmin()) {
            abort(403, 'Chỉ Super Admin mới được xem Dashboard');
        }

        // 1. Lấy tất cả đơn hàng (không tính bảo trì) kèm theo bookings và nhân viên chốt
        $orders = \App\Models\BookingOrder::where('status', '!=', 'maintenance')
            ->with(['bookings', 'staffChot'])
            ->get();

        $revenueByDateMap = [];
        $staffRevenueMap = [];
        $machineRevenueMap = [];

        foreach ($orders as $order) {
            $totalSlots = $order->bookings->count();
            if ($totalSlots === 0) continue;

            $amountPerSlot = (float)$order->final_amount / $totalSlots;
            $staffName = $order->staffChot->name ?? 'Không xác định';
            $staffColor = $order->staffChot->color ?? '#94a3b8';

            foreach ($order->bookings as $booking) {
                $date = $booking->booking_date;
                $productId = $booking->product_id;

                // Phân bổ doanh thu theo ngày
                $revenueByDateMap[$date] = ($revenueByDateMap[$date] ?? 0) + $amountPerSlot;

                // Phân bổ doanh thu theo nhân viên
                if (!isset($staffRevenueMap[$staffName])) {
                    $staffRevenueMap[$staffName] = ['revenue' => 0, 'color' => $staffColor];
                }
                $staffRevenueMap[$staffName]['revenue'] += $amountPerSlot;

                // Phân bổ doanh thu theo máy (cho bảng hòa vốn)
                $machineRevenueMap[$productId] = ($machineRevenueMap[$productId] ?? 0) + $amountPerSlot;
            }
        }

        // Định dạng lại cho biểu đồ doanh thu (30 ngày gần nhất)
        $revenueByDate = collect($revenueByDateMap)
            ->filter(fn($val, $date) => $date >= now()->subDays(30)->toDateString() && $date <= now()->toDateString())
            ->map(fn($total, $date) => ['date' => \Illuminate\Support\Carbon::parse($date)->format('d/m'), 'total' => (float)$total])
            ->sortBy(fn($item) => $item['date'])
            ->values();

        // Định dạng lại cho hiệu suất nhân viên
        $staffPerformance = collect($staffRevenueMap)
            ->map(fn($data, $name) => [
                'name' => $name,
                'revenue' => (float)$data['revenue'],
                'color' => $data['color']
            ])
            ->sortByDesc('revenue')
            ->values();

        // 2. Hiệu suất máy (Tính toán hòa vốn dựa trên doanh thu đã phân bổ)
        $machines = \App\Models\Product::where('publish', 2)
            ->get()
            ->map(function($product) use ($machineRevenueMap) {
                $totalRevenue = (float)($machineRevenueMap[$product->id] ?? 0);
                $costPrice = (float)($product->cost_price ?: 0);
                $remaining = max(0, $costPrice - $totalRevenue);
                $percent = $costPrice > 0 ? min(100, round(($totalRevenue / $costPrice) * 100)) : 0;
                
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'cost_price' => $costPrice,
                    'total_revenue' => $totalRevenue,
                    'remaining' => $remaining,
                    'breakeven_percent' => $percent,
                    'is_breakeven' => $totalRevenue >= $costPrice && $costPrice > 0,
                ];
            })
            ->sortByDesc('total_revenue')
            ->values();

        // 3. Tỷ lệ máy (Phân phối trong tháng hiện tại)
        $currentMonth = now()->month;
        $currentYear = now()->year;
        
        $machineDistribution = \App\Models\ProductBooking::whereMonth('booking_date', $currentMonth)
            ->whereYear('booking_date', $currentYear)
            ->where('status', '!=', 'maintenance')
            ->selectRaw('product_id, COUNT(*) as count')
            ->groupBy('product_id')
            ->get()
            ->map(function($item) {
                return [
                    'name' => \App\Models\Product::find($item->product_id)->name ?? 'N/A',
                    'value' => (int)$item->count
                ];
            })
            ->filter(fn($item) => $item['value'] > 0)
            ->values();

        // 4. Thống kê thuê theo tháng của từng máy (12 tháng năm nay)
        $bookingStats = \App\Models\ProductBooking::query()
            ->whereYear('booking_date', now()->year)
            ->selectRaw('product_id, MONTH(booking_date) as month, COUNT(*) as count')
            ->groupBy('product_id', 'month')
            ->get()
            ->groupBy('product_id');

        $monthlyMachineStats = \App\Models\Product::where('publish', 2)
            ->get()
            ->map(function($product) use ($bookingStats) {
                $productStats = $bookingStats->get($product->id, collect());
                $monthlyData = [];
                for ($m = 1; $m <= 12; $m++) {
                    $stat = $productStats->firstWhere('month', $m);
                    $monthlyData[] = [
                        'month' => 'Th ' . $m,
                        'value' => $stat ? (int)$stat->count : 0
                    ];
                }
                return [
                    'id' => (string)$product->id,
                    'name' => $product->name,
                    'data' => $monthlyData
                ];
            });

        return Inertia::render('backend/dashboard', [
            'revenueByDate' => $revenueByDate,
            'machinePerformance' => $machines,
            'staffPerformance' => $staffPerformance,
            'machineDistribution' => $machineDistribution,
            'monthlyMachineStats' => $monthlyMachineStats,
            'stats' => [
                'total_revenue' => (float)collect($revenueByDateMap)->sum(),
                'total_orders' => \App\Models\BookingOrder::where('status', '!=', 'maintenance')->count(),
                'active_machines' => \App\Models\Product::where('publish', 2)->count(),
            ]
        ]);
    }
}
