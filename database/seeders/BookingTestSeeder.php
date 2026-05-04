<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\User;
use App\Models\ProductBooking;
use App\Models\BookingOrder;
use App\Models\Customer;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BookingTestSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing booking data to avoid confusion
        DB::table('product_bookings')->delete();
        DB::table('booking_orders')->delete();

        $products = Product::where('publish', 2)->get();
        $users = User::all();
        $slots = ['S', 'C', 'T'];

        if ($products->isEmpty() || $users->isEmpty()) {
            $this->command->error('No products or users found. Please seed them first.');
            return;
        }

        // Set some machines as backup
        $products->shuffle()->take(3)->each(function($p) {
            $p->update(['is_backup' => true]);
        });

        $customers = [
            ['name' => 'Nguyễn Văn A', 'phone' => '0912345678'],
            ['name' => 'Trần Thị B', 'phone' => '0987654321'],
            ['name' => 'Lê Văn C', 'phone' => '0900112233'],
            ['name' => 'Phạm Thị D', 'phone' => '0944556677'],
            ['name' => 'Hoàng Văn E', 'phone' => '0888999000'],
        ];

        $today = Carbon::today();
        $sources = ['FB', 'IG', 'Tik Tok', 'Khác'];
        $statuses = ['pending', 'renting', 'finished'];

        $usedSlots = [];

        // Create 20 random orders
        for ($i = 0; $i < 30; $i++) {
            $cust = $customers[array_rand($customers)];
            $product = $products->random();
            
            // Random start date within -7 to +7 days
            $startDate = $today->copy()->addDays(rand(-7, 7));
            $duration = rand(1, 4); // 1 to 4 sessions
            
            $startSlotIdx = rand(0, 2);
            $startSlot = $slots[$startSlotIdx];
            
            // Calculate slots to check availability
            $tempSlots = [];
            $tempCurr = $startDate->copy();
            $tempSlotIdx = $startSlotIdx;
            $canBook = true;
            for ($s = 0; $s < $duration; $s++) {
                $key = "{$product->id}-{$tempCurr->toDateString()}-{$slots[$tempSlotIdx]}";
                if (isset($usedSlots[$key])) {
                    $canBook = false;
                    break;
                }
                $tempSlots[] = [
                    'date' => $tempCurr->toDateString(),
                    'slot' => $slots[$tempSlotIdx],
                    'key' => $key
                ];
                $tempSlotIdx++;
                if ($tempSlotIdx > 2) {
                    $tempSlotIdx = 0;
                    $tempCurr->addDay();
                }
            }

            if (!$canBook) {
                $i--; // retry
                continue;
            }

            $basePrice = rand(100, 500) * 1000;
            $finalPrice = $basePrice;
            
            $staffChot = $users->random();
            $status = $statuses[array_rand($statuses)];
            
            // If it's in the past, set to finished or renting
            if ($startDate->isPast() && !$startDate->isToday()) {
                $status = rand(0, 1) ? 'finished' : 'renting';
            }

            $order = BookingOrder::create([
                'customer_name' => $cust['name'],
                'customer_phone' => $cust['phone'],
                'source' => $sources[array_rand($sources)],
                'total_amount' => $basePrice,
                'final_amount' => $finalPrice,
                'status' => $status,
                'staff_chot_id' => $staffChot->id,
                'staff_giao_may_id' => rand(0, 1) ? $users->random()->id : null,
                'staff_nhan_id' => $status === 'finished' ? $users->random()->id : null,
                'deposit_info' => 'CCCD + 500k',
                'notes' => 'Khách quen, máy cần kiểm tra kỹ lens.',
                'pricing_mode' => 'auto',
            ]);

            foreach ($tempSlots as $ts) {
                ProductBooking::create([
                    'product_id' => $product->id,
                    'booking_order_id' => $order->id,
                    'user_id' => $staffChot->id,
                    'booking_date' => $ts['date'],
                    'slot' => $ts['slot'],
                    'status' => $status,
                ]);
                $usedSlots[$ts['key']] = true;
            }
        }

        // Add some maintenance
        for ($i = 0; $i < 8; $i++) {
            $product = $products->random();
            $date = $today->copy()->addDays(rand(-2, 5));
            $slotIdx = array_rand($slots);
            $slot = $slots[$slotIdx];
            $key = "{$product->id}-{$date->toDateString()}-{$slot}";

            if (isset($usedSlots[$key])) continue;

            $order = BookingOrder::create([
                'customer_name' => 'BẢO TRÌ',
                'status' => 'maintenance',
                'notes' => 'Vệ sinh sensor định kỳ',
            ]);

            ProductBooking::create([
                'product_id' => $product->id,
                'booking_order_id' => $order->id,
                'user_id' => null,
                'booking_date' => $date->toDateString(),
                'slot' => $slot,
                'status' => 'maintenance',
            ]);
            $usedSlots[$key] = true;
        }
    }
}
