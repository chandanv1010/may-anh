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
        Schema::create('booking_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->onDelete('set null');
            $table->string('customer_name');
            $table->string('customer_phone');
            $table->decimal('total_amount', 20, 2)->default(0);
            $table->decimal('discount_amount', 20, 2)->default(0);
            $table->decimal('final_amount', 20, 2)->default(0);
            $table->text('deposit_info')->nullable();
            $table->text('notes')->nullable();
            $table->text('discount_reason')->nullable();
            
            // Staff roles
            $table->foreignId('staff_chot_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('staff_giao_may_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('staff_giao_khach_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('staff_nhan_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('staff_giu_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->string('status')->default('booked'); // booked, finished, cancelled
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_orders');
    }
};
