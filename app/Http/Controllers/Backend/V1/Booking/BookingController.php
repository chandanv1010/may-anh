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
            ->orderBy('order', 'asc')
            ->get();

        // Fetch all users to know their colors
        $users = User::all(['id', 'name', 'color']);

        // Fetch bookings for a range
        // Load 'order.bookings' để modal có thể lấy thời gian thuê khi edit đơn
        $startDate = request()->input('start_date');
        $endDate = request()->input('end_date');

        if ($startDate && $endDate) {
            $bookings = ProductBooking::with(['order.bookings'])->whereBetween('booking_date', [
                Carbon::parse($startDate)->subDays(15)->toDateString(),
                Carbon::parse($endDate)->addDays(15)->toDateString()
            ])->get();
        } else {
            $bookings = ProductBooking::with(['order.bookings'])->whereBetween('booking_date', [
                Carbon::today()->subDays(30)->toDateString(),
                Carbon::today()->addDays(30)->toDateString()
            ])->get();
        }

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

    public function statistics(Request $request): Response
    {
        $user = Auth::user();
        $isSuperAdmin = $user->isSuperAdmin();

        // 1. Get month filter (default to current month)
        $monthStr = $request->input('month', Carbon::now()->format('Y-m'));
        $startOfMonth = Carbon::parse($monthStr . '-01')->startOfMonth();
        $endOfMonth = Carbon::parse($monthStr . '-01')->endOfMonth();

        // 2. Get user filter (personnel filter)
        $filterUserId = $request->input('user_id', 'all');

        // Check permissions for non-superadmin
        if (!$isSuperAdmin) {
            $subordinateIds = User::where('parent_id', $user->id)->pluck('id')->toArray();
            $allowedIds = array_merge([$user->id], $subordinateIds);

            if ($filterUserId !== 'all' && !in_array((int)$filterUserId, $allowedIds)) {
                $filterUserId = 'all';
            }
        }

        // Chi lay dung nhung cot trang thong ke dung den.
        //
        // Truoc day nap 'bookings.product' + 5 quan he staff + 'commissions.user' o dang
        // day du. Model User co $appends=['permissions'] va tu nap 'user_catalogues', nen
        // MOI bang ten nhan vien keo theo ~55KB; con Product co accessor 'name' keo theo
        // toan bo quan he ngon ngu. Ket qua: 115 don thanh 16MB JSON, RAM dinh 104MB ->
        // vuot memory_limit 128M va trang bao loi 500.
        //
        // 'commissions.user' bi bo hoan toan: trang chi doc c.user_id va c.commission_amount.
        $query = BookingOrder::query()
            ->with([
                'bookings:id,booking_order_id,product_id,booking_date,slot',
                'staffChot:id,name,color',
                'staffGiaoMay:id,name,color',
                'staffGiaoKhach:id,name,color',
                'staffNhan:id,name,color',
                'staffGiu:id,name,color',
                'commissions:id,booking_order_id,user_id,commission_amount',
            ])
            ->orderBy('created_at', 'desc');

        // Apply Month filter: check bookings booking_date, or fallback to created_at
        $query->where(function($q) use ($startOfMonth, $endOfMonth) {
            $q->whereHas('bookings', function($subQ) use ($startOfMonth, $endOfMonth) {
                $subQ->whereBetween('booking_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()]);
            })->orWhere(function($subQ) use ($startOfMonth, $endOfMonth) {
                $subQ->whereDoesntHave('bookings')
                     ->whereBetween('created_at', [$startOfMonth, $endOfMonth]);
            });
        });

        // Apply Personnel (User) filter
        if ($filterUserId !== 'all') {
            $selectedUser = User::find($filterUserId);
            if ($selectedUser) {
                $subordinateIds = User::where('parent_id', $filterUserId)->pluck('id')->toArray();
                $targetUserIds = array_merge([(int)$filterUserId], $subordinateIds);
                $query->whereIn('staff_chot_id', $targetUserIds);
            }
        } else {
            // If user is not superadmin, they can only see their own and their subordinates' bookings
            if (!$isSuperAdmin) {
                $subordinateIds = User::where('parent_id', $user->id)->pluck('id')->toArray();
                $targetUserIds = array_merge([$user->id], $subordinateIds);
                $query->whereIn('staff_chot_id', $targetUserIds);
            }
        }

        $orders = $query->get();

        // 3. Determine the list of filtered users for the columns
        if ($filterUserId !== 'all') {
            $selectedUser = User::find($filterUserId);
            if ($selectedUser) {
                $subordinateIds = User::where('parent_id', $filterUserId)->pluck('id')->toArray();
                $targetUserIds = array_merge([(int)$filterUserId], $subordinateIds);
                $filteredUsers = User::whereIn('id', $targetUserIds)->get();
            } else {
                $filteredUsers = collect();
            }
        } else {
            if ($isSuperAdmin) {
                $filteredUsers = User::orderBy('name', 'asc')->get();
            } else {
                // Non-superadmin: Show self and subordinates
                $subordinateIds = User::where('parent_id', $user->id)->pluck('id')->toArray();
                $targetUserIds = array_merge([$user->id], $subordinateIds);
                $filteredUsers = User::whereIn('id', $targetUserIds)->get();
            }
        }

        // 4. Fetch members for the personnel filter dropdown
        if ($isSuperAdmin) {
            $allowedMembers = User::orderBy('name', 'asc')->get(['id', 'name']);
        } else {
            $subordinateIds = User::where('parent_id', $user->id)->pluck('id')->toArray();
            $allowedIds = array_merge([$user->id], $subordinateIds);
            $allowedMembers = User::whereIn('id', $allowedIds)->orderBy('name', 'asc')->get(['id', 'name']);
        }

        // Ten may: lay thang tu bang dich, khong di qua accessor Product::name. Accessor do
        // nap quan he current_languages voi ca description + content, moi may vai chuc KB.
        $tenMay = DB::table('product_language')
            ->where('language_id', config('app.language_id'))
            ->whereIn('product_id', $orders->pluck('bookings.*.product_id')->flatten()->filter()->unique())
            ->pluck('name', 'product_id');

        $nhanVien = fn ($nv) => $nv === null ? null : [
            'id' => $nv->id,
            'name' => $nv->name,
            'color' => $nv->color,
        ];

        return Inertia::render('backend/booking/statistics', [
            // Dung mang phang thay vi model: chi nhung field statistics.tsx doc den. Truoc
            // day tra ve model day du nen payload len 16MB va trang bao loi 500.
            'orders' => $orders->map(fn ($don) => [
                'id' => $don->id,
                'customer_name' => $don->customer_name,
                'customer_phone' => $don->customer_phone,
                'status' => $don->status,
                'notes' => $don->notes,
                'deposit_info' => $don->deposit_info,
                'final_amount' => $don->final_amount,
                'created_at' => optional($don->created_at)->toDateTimeString(),
                'bookings' => $don->bookings->map(fn ($ca) => [
                    'id' => $ca->id,
                    'booking_date' => $ca->booking_date,
                    'slot' => $ca->slot,
                    'product' => ['name' => $tenMay[$ca->product_id] ?? null],
                ])->values(),
                'staff_chot' => $nhanVien($don->staffChot),
                'staff_giao_may' => $nhanVien($don->staffGiaoMay),
                'staff_giao_khach' => $nhanVien($don->staffGiaoKhach),
                'staff_nhan' => $nhanVien($don->staffNhan),
                'staff_giu' => $nhanVien($don->staffGiu),
                'commissions' => $don->commissions->map(fn ($hh) => [
                    'user_id' => $hh->user_id,
                    'commission_amount' => $hh->commission_amount,
                ])->values(),
            ])->values(),
            'users' => $allowedMembers,
            // filteredUsers chi dung u.id va u.name -> khong tra ve ca ban ghi User.
            'filteredUsers' => $filteredUsers->map(fn ($nv) => [
                'id' => $nv->id,
                'name' => $nv->name,
            ])->values(),
            // Bo 'machines': statistics.tsx co destructure nhung khong dung o bat cu dau.
            'isSuperAdmin' => $isSuperAdmin,
            'request' => [
                'month' => $monthStr,
                'user_id' => $filterUserId,
            ]
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

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('uploads/bookings', 'public');
            $data['image'] = '/storage/' . $path;
        } elseif (!$request->has('image') || $request->input('image') === 'null') {
            $data['image'] = null;
        } else {
            $data['image'] = $request->input('image');
        }

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
                                ->where('status', '!=', 'cancelled')
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

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('uploads/bookings', 'public');
            $data['image'] = '/storage/' . $path;
        } elseif (!$request->has('image') || $request->input('image') === 'null') {
            $data['image'] = null;
        } else {
            $data['image'] = $request->input('image');
        }

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
                // Check for Overlaps (excluding current order's slots and cancelled bookings)
                foreach ($data['rental_periods'] as $period) {
                    $currentDate = Carbon::parse($period['startDate']);
                    $endDate = Carbon::parse($period['endDate']);
                    
                    while ($currentDate->lte($endDate)) {
                        foreach (['S', 'C', 'T'] as $slot) {
                            if ($this->isSlotInRange($currentDate, $slot, $period)) {
                                $exists = ProductBooking::where('product_id', $data['product_id'])
                                    ->where('booking_date', $currentDate->toDateString())
                                    ->where('slot', $slot)
                                    ->where('booking_order_id', '!=', $order->id)
                                    ->where('status', '!=', 'cancelled')
                                    ->exists();
                                
                                if ($exists) {
                                    throw new \Exception("Máy đã có người đặt vào ngày {$currentDate->toDateString()} buổi {$slot}. Vui lòng kiểm tra lại!");
                                }
                            }
                        }
                        $currentDate->addDay();
                    }
                }

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
