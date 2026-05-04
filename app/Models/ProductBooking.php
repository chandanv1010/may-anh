<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductBooking extends Model
{
    protected $fillable = [
        'product_id',
        'user_id',
        'booking_order_id',
        'booking_date',
        'slot',
        'status',
        'notes',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function order()
    {
        return $this->belongsTo(BookingOrder::class, 'booking_order_id');
    }
}
