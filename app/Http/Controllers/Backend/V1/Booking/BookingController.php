<?php

namespace App\Http\Controllers\Backend\V1\Booking;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\User;
use App\Models\ProductBooking;
use App\Models\BookingOrder;
use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Services\Interfaces\Booking\BookingServiceInterface as BookingService;

class BookingController extends Controller
{
    protected $service;

    public function __construct(
        BookingService $service
    ) {
        $this->service = $service;
    }
    /**
     * Display a listing of the bookings.
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $records = $this->service->paginate($request);
        $users = User::all(['id', 'name', 'color']);
        
        $machines = Product::where('publish', 2)
            ->with(['current_languages', 'languages', 'product_catalogues'])
            ->orderBy('product_catalogue_id', 'asc')
            ->orderBy('order', 'asc')
            ->get();
            
        $catalogues = \App\Models\ProductCatalogue::where('publish', 2)
            ->with(['current_languages'])
            ->get();

        return Inertia::render('backend/booking/index', [
            'records' => $records,
            'users' => $users,
            'machines' => $machines,
            'catalogues' => $catalogues,
            'request' => $request->all(),
        ]);
    }

    /**
     * Display the booking calendar.
     *
     * @return Response
     */
    public function calendar(): Response
    {
        // Fetch all products (machines) to show in the calendar
        $machines = Product::where('publish', 2)
            ->with(['current_languages', 'languages', 'product_catalogues'])
            ->orderBy('product_catalogue_id', 'asc')
            ->orderBy('order', 'asc')
            ->get();

        // Fetch all users to know their colors
        $users = User::all(['id', 'name', 'color']);

        // Fetch bookings for a range (e.g., 30 days around today)
        $bookings = ProductBooking::with(['order.bookings'])->whereBetween('booking_date', [
            Carbon::today()->subDays(30)->toDateString(),
            Carbon::today()->addDays(30)->toDateString()
        ])->get();

        // Fetch product catalogues for filtering
        $catalogues = \App\Models\ProductCatalogue::where('publish', 2)
            ->with(['current_languages'])
            ->get();

        return Inertia::render('backend/booking/calendar', [
            'machines' => $machines,
            'users' => $users,
            'bookings' => $bookings,
            'catalogues' => $catalogues,
            'isSuperAdmin' => Auth::user()->isSuperAdmin(),
            'currentUser' => Auth::user(),
        ]);
    }

    public function statistics(): Response
    {
        $user = Auth::user();
        $isSuperAdmin = $user->isSuperAdmin();

        $query = BookingOrder::with([
            'bookings.product',
            'staffChot',
            'staffGiaoMay',
            'staffGiaoKhach',
            'staffNhan',
            'staffGiu'
        ])->orderBy('created_at', 'desc');

        // Phân quyền: Nếu không phải Super Admin thì chỉ thấy đơn mình chốt
        if (!$isSuperAdmin) {
            $query->where('staff_chot_id', $user->id);
        }

        $orders = $query->get();

        return Inertia::render('backend/booking/statistics', [
            'orders' => $orders,
            'users' => User::all(),
            'machines' => Product::where('publish', 2)->get(),
            'isSuperAdmin' => $isSuperAdmin,
        ]);
    }

    /**
     * Search customers for autocomplete.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function searchCustomer(Request $request)
    {
        $query = $request->get('query');
        if (strlen($query) < 1) {
            return response()->json([]);
        }

        $customers = \App\Models\Customer::with('customer_catalogue')
            ->where('first_name', 'LIKE', "%{$query}%")
            ->orWhere('last_name', 'LIKE', "%{$query}%")
            ->orWhere('phone', 'LIKE', "%{$query}%")
            ->limit(10)
            ->get();

        // Map to include the computed 'name' attribute and discount info
        $results = $customers->map(function ($customer) {
            return [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'discount_percent' => $customer->customer_catalogue->discount_percent ?? 0,
                'catalogue_name' => $customer->customer_catalogue->name ?? '',
            ];
        });

        return response()->json($results);
    }

    public function store(Request $request)
    {
        $rules = [
            'product_id' => 'required|exists:products,id',
            'rental_periods' => 'required|array|min:1',
            'rental_periods.*.startDate' => 'required|date',
            'rental_periods.*.endDate' => 'required|date|after_or_equal:rental_periods.*.startDate',
            'rental_periods.*.startSlot' => 'required|in:S,C,T',
            'rental_periods.*.endSlot' => 'required|in:S,C,T',
            'staff_roles.chot' => 'required|not_in:none',
            'status' => 'required|in:pending,renting,finished,cancelled,maintenance',
        ];

        if ($request->status !== 'maintenance') {
            $rules['customer_name'] = 'required|string|max:255';
            $rules['customer_phone'] = 'required|string|max:20';
        }

        $request->validate($rules);

        $data = $request->all();

        return DB::transaction(function () use ($data) {
            // 1. Identify or Create Customer
            $customer = null;
            if (!empty($data['customer_id'])) {
                $customer = Customer::find($data['customer_id']);
            }

            if (!$customer && !empty($data['customer_phone'])) {
                // Try to find by phone
                $customer = Customer::where('phone', $data['customer_phone'])->first();
            }

            if (!$customer && $data['status'] !== 'maintenance') {
                // Create new customer
                $customer = Customer::create([
                    'first_name' => $data['customer_name'],
                    'last_name' => '',
                    'email' => uniqid() . '@guest.com',
                    'phone' => $data['customer_phone'],
                    'publish' => 2,
                    'user_id' => Auth::id() ?? 1,
                ]);
            }

            // 2. Check for Overlaps (Concurrency protection)
            foreach ($data['rental_periods'] as $period) {
                $currentDate = Carbon::parse($period['startDate']);
                $endDate = Carbon::parse($period['endDate']);
                
                while ($currentDate->lte($endDate)) {
                    foreach (['S', 'C', 'T'] as $slot) {
                        if ($this->isSlotInRange($currentDate, $slot, $period)) {
                            $exists = ProductBooking::where('product_id', $data['product_id'])
                                ->where('booking_date', $currentDate->toDateString())
                                ->where('slot', $slot)
                                ->exists();
                            
                            if ($exists) {
                                throw new \Exception("Máy đã có người đặt vào ngày {$currentDate->toDateString()} buổi {$slot}. Vui lòng kiểm tra lại!");
                            }
                        }
                    }
                    $currentDate->addDay();
                }
            }

            // 3. Create Booking Order
            $order = BookingOrder::create([
                'customer_id' => $customer?->id,
                'customer_name' => $customer?->name ?: ($data['customer_name'] ?? 'BẢO TRÌ'),
                'customer_phone' => $customer?->phone ?: ($data['customer_phone'] ?? ''),
                'customer_discount_percent' => $data['customer_discount_percent'] ?? 0,
                'source' => $data['source'] ?? 'Khác',
                'total_amount' => $data['total_amount'] ?? 0,
                'discount_amount' => $data['discount_amount'] ?? 0,
                'final_amount' => $data['final_amount'] ?? 0,
                'deposit_info' => $data['deposit_info'],
                'notes' => $data['notes'],
                'image' => $data['image'] ?? null,
                'discount_reason' => $data['promotion_reason'],
                'promotion_type' => $data['promotion_type'] ?? $data['promotion_mode'] ?? 'money',
                'promotion_value' => $data['promotion_value'] ?? $data['promotion_amount'] ?? 0,
                'pricing_mode' => $data['pricing_mode'] ?? 'auto',
                'status' => $data['status'] ?? 'pending',
                'staff_chot_id' => $this->nullIfNone($data['staff_roles']['chot']),
                'staff_giao_may_id' => $this->nullIfNone($data['staff_roles']['giao_may']),
                'staff_giao_khach_id' => $this->nullIfNone($data['staff_roles']['giao_khach']),
                'staff_nhan_id' => $this->nullIfNone($data['staff_roles']['nhan']),
                'staff_giu_id' => $this->nullIfNone($data['staff_roles']['giu']),
            ]);

            // 4. Create Product Bookings (Slots)
            $this->createSlots($order, $data);

            return redirect()->back()->with('success', 'Đã tạo đơn hàng thành công!');
        });
    }

    public function update(Request $request, $id)
    {
        $order = BookingOrder::findOrFail($id);
        $rules = [
            'product_id' => 'required|integer',
            'rental_periods' => 'required|array',
            'total_amount' => 'required|numeric',
            'discount_amount' => 'required|numeric',
            'final_amount' => 'required|numeric',
            'status' => 'required|string',
        ];

        if ($request->status !== 'maintenance') {
            $rules['customer_name'] = 'required|string';
            $rules['customer_phone'] = 'required|string';
        }

        $data = $request->validate($rules);

        // Merge rest of data
        $data = array_merge($request->all(), $data);

        return DB::transaction(function () use ($order, $data) {
            $oldStatus = $order->status;
            $order->update([
                'customer_name' => $data['customer_name'] ?? 'BẢO TRÌ',
                'customer_phone' => $data['customer_phone'] ?? '',
                'customer_discount_percent' => $data['customer_discount_percent'] ?? 0,
                'source' => $data['source'] ?? 'Khác',
                'total_amount' => $data['total_amount'] ?? 0,
                'discount_amount' => $data['discount_amount'] ?? 0,
                'final_amount' => $data['final_amount'] ?? 0,
                'deposit_info' => $data['deposit_info'] ?? '',
                'notes' => $data['notes'] ?? '',
                'image' => $data['image'] ?? null,
                'discount_reason' => $data['promotion_reason'] ?? '',
                'promotion_type' => $data['promotion_type'] ?? $data['promotion_mode'] ?? 'money',
                'promotion_value' => $data['promotion_value'] ?? $data['promotion_amount'] ?? 0,
                'pricing_mode' => $data['pricing_mode'] ?? 'auto',
                'status' => $data['status'],
                'staff_chot_id' => $this->nullIfNone($data['staff_roles']['chot'] ?? null),
                'staff_giao_may_id' => $this->nullIfNone($data['staff_roles']['giao_may'] ?? null),
                'staff_giao_khach_id' => $this->nullIfNone($data['staff_roles']['giao_khach'] ?? null),
                'staff_nhan_id' => $this->nullIfNone($data['staff_roles']['nhan'] ?? null),
                'staff_giu_id' => $this->nullIfNone($data['staff_roles']['giu'] ?? null),
            ]);

            // Sync slots: If status was pending, we allow full sync.
            // If already renting/finished, we only update status of existing slots.
            if ($order->getOriginal('status') === 'pending') {
                $order->bookings()->delete();
                $this->createSlots($order, $data);
            } else {
                $order->bookings()->update([
                    'status' => $order->status,
                    'user_id' => $order->staff_chot_id
                ]);
            }

            // Record into Cash Book if status changed to 'renting' or 'finished'
            $targetStatuses = ['renting', 'finished'];
            if (!in_array($oldStatus, $targetStatuses) && in_array($order->status, $targetStatuses)) {
                $exists = \App\Models\CashTransaction::where('reference_code', 'BK-' . $order->id)->exists();
                if (!$exists) {
                    \App\Models\CashTransaction::create([
                        'transaction_code' => \App\Models\CashTransaction::generateTransactionCode('receipt'),
                        'transaction_type' => 'receipt',
                        'payment_method' => 'cash',
                        'partner_group' => 'customer',
                        'partner_id' => $order->customer_id,
                        'partner_name' => $order->customer_name,
                        'reason_id' => 6, // Thu tiền bán hàng
                        'amount' => $order->final_amount,
                        'description' => 'Thu tiền thuê máy - Đơn hàng #' . $order->id,
                        'transaction_date' => now(),
                        'reference_code' => 'BK-' . $order->id,
                        'user_id' => Auth::id(),
                        'publish' => 2, // Assuming 2 means published/active
                    ]);
                }
            }

            return redirect()->back()->with('success', 'Cập nhật đơn hàng thành công!');
        });
    }

    private function createSlots($order, $data) {
        foreach ($data['rental_periods'] as $period) {
            $currentDate = Carbon::parse($period['startDate']);
            $endDate = Carbon::parse($period['endDate']);
            
            while ($currentDate->lte($endDate)) {
                foreach (['S', 'C', 'T'] as $slot) {
                    if ($this->isSlotInRange($currentDate, $slot, $period)) {
                        ProductBooking::create([
                            'product_id' => $data['product_id'],
                            'booking_order_id' => $order->id,
                            'user_id' => $order->staff_chot_id,
                            'booking_date' => $currentDate->toDateString(),
                            'slot' => $slot,
                            'status' => $order->status,
                        ]);
                    }
                }
                $currentDate->addDay();
            }
        }
    }

    private function nullIfNone($value) {
        return ($value === 'none' || !$value) ? null : $value;
    }

    private function isSlotInRange($date, $slot, $period) {
        $currentVal = $this->getSlotValue($date->toDateString(), $slot);
        $startVal = $this->getSlotValue($period['startDate'], $period['startSlot']);
        $endVal = $this->getSlotValue($period['endDate'], $period['endSlot']);
        
        return $currentVal >= $startVal && $currentVal <= $endVal;
    }

    private function getSlotValue($date, $slot) {
        $slotsList = ['S', 'C', 'T'];
        $time = Carbon::parse($date)->timestamp / (60 * 60 * 24);
        $offset = array_search($slot, $slotsList);
        return $time * 3 + $offset;
    }
}
