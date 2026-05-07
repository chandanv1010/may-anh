<?php

namespace App\Services\Impl\V1\Booking;

use App\Services\Interfaces\Booking\BookingServiceInterface;
use App\Services\Impl\V1\BaseService;
use App\Repositories\Booking\BookingRepo;

class BookingService extends BaseService implements BookingServiceInterface
{
    protected $repository;

    protected $perpage = 20;
    protected $simpleFilter = [];
    protected $complexFilter = ['id', 'status', 'staff_chot_id'];
    protected $dateFilter = ['created_at'];
    protected $searchFields = ['customer_name', 'customer_phone'];
    protected $with = ['bookings.product', 'staffChot'];

    public function __construct(
        BookingRepo $repository
    ) {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static
    {
        $this->modelData = $this->request->all();
        return $this;
    }
}
