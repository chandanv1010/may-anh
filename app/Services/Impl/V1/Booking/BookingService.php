<?php

namespace App\Services\Impl\V1\Booking;

use App\Services\Interfaces\Booking\BookingServiceInterface;
use App\Services\Impl\V1\BaseService;
use App\Repositories\Booking\BookingRepo;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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

    /**
     * Override paginate để giới hạn dữ liệu theo quyền user:
     * - Superadmin: thấy tất cả
     * - User thường: chỉ thấy đơn của mình và của các user có parent_id = id của mình
     */
    public function paginate(Request $request)
    {
        $this->setRequest($request);
        $specifications = $this->specifications();

        $user = Auth::user();

        if ($user && !$user->isSuperAdmin()) {
            // Lấy danh sách subordinates (user có parent_id = id user hiện tại)
            $subordinateIds = User::where('parent_id', $user->id)->pluck('id')->toArray();
            $allowedIds = array_merge([$user->id], $subordinateIds);

            // Inject constraint vào model trước khi query
            $this->result = $this->repository->getModel()
                ->whereIn('staff_chot_id', $allowedIds)
                ->simpleFilter($specifications['filter']['simple'] ?? [])
                ->complexFilter($specifications['filter']['complex'] ?? [])
                ->dateFilter($specifications['filter']['date'] ?? [])
                ->withFilter($specifications['filter']['with'] ?? [])
                ->keyword($specifications['filter']['keyword'] ?? [])
                ->when(!empty($specifications['sort']), function ($query) use ($specifications) {
                    $sort = $specifications['sort'];
                    if (isset($sort[0]) && is_array($sort[0])) {
                        foreach ($sort as $s) {
                            if (isset($s[0], $s[1])) {
                                $query->orderBy($s[0], $s[1]);
                            }
                        }
                    } elseif (isset($sort[0], $sort[1])) {
                        $query->orderBy($sort[0], $sort[1]);
                    }
                })
                ->with($specifications['with'] ?? [])
                ->when(
                    $specifications['all'],
                    fn($q) => $q->get(),
                    fn($q) => $q->paginate($specifications['perpage'])->withQueryString()
                );

            return $this->result;
        }

        // Superadmin: dùng flow mặc định
        $this->result = $this->repository->pagination($specifications);
        return $this->result;
    }
}

