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
        // 1. Add commission_rate to user_catalogues table
        Schema::table('user_catalogues', function (Blueprint $table) {
            $table->decimal('commission_rate', 5, 2)->default(0.00)->after('description')->comment('Tỉ lệ % hoa hồng nhóm được hưởng');
        });

        // 2. Add parent_id (manager) to users table
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_id')->nullable()->after('user_id')->comment('ID người quản lý trực tiếp');
            $table->foreign('parent_id')->references('id')->on('users')->onDelete('set null');
        });

        // 3. Create commission_histories table
        Schema::create('commission_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_order_id')->constrained('booking_orders')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade')->comment('Người nhận hoa hồng');
            $table->foreignId('received_from_user_id')->nullable()->constrained('users')->onDelete('set null')->comment('Nhân viên cấp dưới tạo đơn');
            $table->string('type')->comment('creator: người tạo đơn, manager: người quản lý');
            $table->decimal('order_amount', 15, 2)->comment('Giá trị đơn hàng tính hoa hồng');
            $table->decimal('commission_rate', 5, 2)->comment('Tỉ lệ % hoa hồng');
            $table->decimal('commission_amount', 15, 2)->comment('Số tiền hoa hồng nhận được (hoặc âm nếu hoàn trả)');
            $table->string('status')->default('active')->comment('active: hoạt động, refunded: đã hoàn trả');
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('commission_histories');

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropColumn('parent_id');
        });

        Schema::table('user_catalogues', function (Blueprint $table) {
            $table->dropColumn('commission_rate');
        });
    }
};
