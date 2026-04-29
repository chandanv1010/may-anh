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
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('price_6h', 20, 2)->default(0)->after('wholesale_price');
            $table->decimal('price_1d', 20, 2)->default(0)->after('price_6h');
            $table->decimal('price_3d', 20, 2)->default(0)->after('price_1d');
            $table->text('deposit')->nullable()->after('price_3d');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['price_6h', 'price_1d', 'price_3d', 'deposit']);
        });
    }
};
