<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\User;
use App\Models\ProductBooking;
use Carbon\Carbon;

class ProductBookingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = Product::where('publish', 2)->get();
        $users = User::all();
        $slots = ['S', 'C', 'T'];

        if ($products->isEmpty() || $users->isEmpty()) {
            return;
        }

        // Generate data for 30 days (15 past, 15 future)
        $today = Carbon::today();
        
        foreach ($products->slice(0, 20) as $product) {
            for ($i = -15; $i <= 15; $i++) {
                $date = $today->copy()->addDays($i);
                
                foreach ($slots as $slot) {
                    // Randomly decide if this slot is booked, maintenance or empty
                    $rand = rand(1, 100);
                    
                    if ($rand > 80) { // 20% chance of booking
                        ProductBooking::create([
                            'product_id' => $product->id,
                            'user_id' => $users->random()->id,
                            'booking_date' => $date->toDateString(),
                            'slot' => $slot,
                            'status' => 'booked',
                        ]);
                    } elseif ($rand < 5) { // 5% chance of maintenance
                        ProductBooking::create([
                            'product_id' => $product->id,
                            'user_id' => null,
                            'booking_date' => $date->toDateString(),
                            'slot' => $slot,
                            'status' => 'maintenance',
                        ]);
                    }
                }
            }
        }
    }
}
