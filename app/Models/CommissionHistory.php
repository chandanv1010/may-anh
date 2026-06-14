<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasQuery;

class CommissionHistory extends Model
{
    use HasFactory, HasQuery;

    protected $fillable = [
        'booking_order_id',
        'user_id',
        'received_from_user_id',
        'type',
        'order_amount',
        'commission_rate',
        'commission_amount',
        'status',
        'description',
    ];

    /**
     * Get the booking order associated with this commission.
     */
    public function bookingOrder(): BelongsTo
    {
        return $this->belongsTo(BookingOrder::class, 'booking_order_id');
    }

    /**
     * Get the user who received the commission.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the subordinate user whose order triggered this commission.
     */
    public function receivedFrom(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_from_user_id');
    }

    protected $casts = [
        'order_amount' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];
}
