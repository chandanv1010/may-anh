<?php

namespace App\Services\Interfaces;

use App\Models\BookingOrder;
use Illuminate\Http\Request;

interface CommissionServiceInterface
{
    /**
     * Calculate and save commission for an order.
     *
     * @param BookingOrder $order
     * @return bool
     */
    public function calculate(BookingOrder $order): bool;

    /**
     * Revert / refund commission when an order is cancelled or status changes.
     *
     * @param BookingOrder $order
     * @return bool
     */
    public function refund(BookingOrder $order): bool;

    /**
     * Get commission histories with filters based on user role.
     *
     * @param Request $request
     * @return mixed
     */
    public function getHistory(Request $request);

    /**
     * Get commission statistics based on user role.
     *
     * @param Request $request
     * @return array
     */
    public function getStatistics(Request $request): array;

    /**
     * Bảng tổng hợp hoa hồng theo từng người, dùng để trả tiền cuối tháng.
     *
     * @param Request $request
     * @return array<int,array<string,mixed>>
     */
    public function getSummaryByUser(Request $request): array;
}
