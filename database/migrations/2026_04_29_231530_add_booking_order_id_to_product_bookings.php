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
            $table->foreignId('booking_order_id')->nullable()->after('id')->constrained('booking_orders')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('booking_order_id');
        });
    }
};
