<?php

namespace App\Models;

use App\Traits\HasQuery;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Review extends Model
{
    // HasQuery cung cap cac scope simpleFilter/complexFilter/dateFilter/withFilter/keyword
    // ma BaseRepo::pagination() goi. Thieu trait nay thi /backend/review loi 500
    // "Call to undefined method App\Models\Review::simpleFilter()".
    use HasFactory, SoftDeletes, HasQuery;

    protected $fillable = [
        'reviewable_id',
        'reviewable_type',
        'user_id',
        'fullname',
        'email',
        'phone',
        'score',
        'content',
        'publish',
    ];

    public function reviewable()
    {
        return $this->morphTo();
    }
}
