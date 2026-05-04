<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('booking_orders', function (Blueprint $table) {
            $table->string('promotion_type')->nullable()->after('discount_reason'); // money, percent
            $table->decimal('promotion_value', 20, 2)->default(0)->after('promotion_type');
        });

        // Migrate 'booked' to 'pending'
        DB::table('booking_orders')->where('status', 'booked')->update(['status' => 'pending']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_orders', function (Blueprint $table) {
            $table->dropColumn(['promotion_type', 'promotion_value']);
        });
    }
};
