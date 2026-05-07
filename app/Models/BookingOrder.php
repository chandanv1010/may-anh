<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use App\Traits\HasQuery;

class BookingOrder extends Model
{
    use HasFactory, HasQuery;

    protected $fillable = [
        'customer_id',
        'customer_name',
        'customer_phone',
        'customer_discount_percent',
        'source',
        'total_amount',
        'discount_amount',
        'final_amount',
        'pricing_mode',
        'deposit_info',
        'notes',
        'discount_reason',
        'promotion_type',
        'promotion_value',
        'staff_chot_id',
        'staff_giao_may_id',
        'staff_giao_khach_id',
        'staff_nhan_id',
        'staff_giu_id',
        'status',
    ];

    public function bookings()
    {
        return $this->hasMany(ProductBooking::class);
    }

    public function staffChot()
    {
        return $this->belongsTo(User::class, 'staff_chot_id');
    }

    public function staffGiaoMay()
    {
        return $this->belongsTo(User::class, 'staff_giao_may_id');
    }

    public function staffGiaoKhach()
    {
        return $this->belongsTo(User::class, 'staff_giao_khach_id');
    }

    public function staffNhan()
    {
        return $this->belongsTo(User::class, 'staff_nhan_id');
    }

    public function staffGiu()
    {
        return $this->belongsTo(User::class, 'staff_giu_id');
    }
}
