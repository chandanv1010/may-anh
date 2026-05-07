<?php  
namespace App\Repositories\Booking;

use App\Repositories\BaseRepo;
use App\Models\BookingOrder;

class BookingRepo extends BaseRepo {
    protected $model;

    public function __construct(
        BookingOrder $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }
}
