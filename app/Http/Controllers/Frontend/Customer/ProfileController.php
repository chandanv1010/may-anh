<?php

namespace App\Http\Controllers\Frontend\Customer;

use App\Http\Controllers\Controller;
use App\Services\Interfaces\Customer\CustomerServiceInterface;
use App\Services\Interfaces\Order\OrderServiceInterface;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    protected $customerService;
    protected $orderService;

    public function __construct(
        CustomerServiceInterface $customerService,
        OrderServiceInterface $orderService
    )
    {
        $this->customerService = $customerService;
        $this->orderService = $orderService;
    }

    /**
     * Hiển thị trang thông tin cá nhân
     */
    public function index(): Response
    {
        return Inertia::render('frontend/customer/profile', [
            'customer' => Auth::guard('customer')->user()
        ]);
    }

    /**
     * Cập nhật thông tin cá nhân
     */
    public function update(Request $request): RedirectResponse
    {
        $customer = Auth::guard('customer')->user();
        
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        try {
            $result = $this->customerService->save($request, $customer->id);
            if ($result) {
                return back()->with('success', 'Thông tin cá nhân đã được cập nhật thành công!');
            }
            return back()->with('error', 'Không thể lưu thông tin, vui lòng kiểm tra lại.');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Profile Update Exception: ' . $e->getMessage());
            return back()->with('error', 'Lỗi hệ thống: ' . $e->getMessage());
        }
    }

    /**
     * Hiển thị trang đổi mật khẩu
     */
    public function password(): Response
    {
        return Inertia::render('frontend/customer/change-password');
    }

    /**
     * Xử lý đổi mật khẩu
     */
    public function updatePassword(Request $request): RedirectResponse
    {
        $customerId = Auth::guard('customer')->id();
        
        try {
            $this->customerService->updatePassword($request, $customerId);
            return back()->with('success', 'Đổi mật khẩu thành công!');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage() ?: 'Có lỗi xảy ra.');
        }
    }

    /**
     * Hiển thị danh sách đơn hàng của khách hàng
     */
    public function orders(): Response
    {
        $customerId = Auth::guard('customer')->id();
        
        $orders = Order::with(['orderItems.product', 'orderItems.variant', 'paymentMethod'])
            ->where('customer_id', $customerId)
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('frontend/customer/orders', [
            'orders' => $orders
        ]);
    }

    /**
     * Hủy đơn hàng (Chỉ dành cho đơn hàng Pending)
     */
    public function cancelOrder(int $id): RedirectResponse
    {
        $customerId = Auth::guard('customer')->id();
        $order = Order::where('id', $id)
            ->where('customer_id', $customerId)
            ->where('order_status', 'pending')
            ->first();

        if (!$order) {
            return back()->with('error', 'Không tìm thấy đơn hàng hoặc đơn hàng không thể hủy.');
        }

        try {
            // Sử dụng OrderService->save để kích hoạt logic afterSave (Hoàn tồn kho)
            $request = new Request([
                'id' => $id,
                'order_status' => 'cancelled'
            ]);
            
            $this->orderService->save($request, $id);
            
            return back()->with('success', 'Đơn hàng đã được hủy thành công.');
        } catch (\Exception $e) {
            return back()->with('error', 'Có lỗi xảy ra khi hủy đơn hàng: ' . $e->getMessage());
        }
    }
}
