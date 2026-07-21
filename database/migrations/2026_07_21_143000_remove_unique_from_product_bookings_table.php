<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('product_bookings', function (Blueprint $table) {
            $table->dropUnique('product_bookings_product_id_booking_date_slot_unique');
            $table->index(['product_id', 'booking_date', 'slot']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_bookings', function (Blueprint $table) {
            $table->dropIndex(['product_id', 'booking_date', 'slot']);
            $table->unique(['product_id', 'booking_date', 'slot']);
        });
    }
};
