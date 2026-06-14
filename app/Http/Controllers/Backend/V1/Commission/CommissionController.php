<?php

namespace App\Http\Controllers\Backend\V1\Commission;

use App\Http\Controllers\Controller;
use App\Services\Interfaces\CommissionServiceInterface;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CommissionController extends Controller
{
    protected $commissionService;

    public function __construct(CommissionServiceInterface $commissionService)
    {
        $this->commissionService = $commissionService;
    }

    /**
     * Display a listing of the commission histories.
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();
        
        // Fetch statistics based on filter
        $stats = $this->commissionService->getStatistics($request);
        
        // Fetch paginated history list
        $histories = $this->commissionService->getHistory($request);
        
        // Fetch members for filter dropdown based on role
        $allowedMembers = [];
        if ($user->isSuperAdmin()) {
            // Superadmin can see and filter by all users
            $allowedMembers = User::orderBy('name', 'asc')->get(['id', 'name', 'email']);
        } else {
            // Manager can filter by self and direct subordinates
            $subordinateIds = User::where('parent_id', $user->id)->pluck('id')->toArray();
            if (count($subordinateIds) > 0) {
                $allowedIds = array_merge([$user->id], $subordinateIds);
                $allowedMembers = User::whereIn('id', $allowedIds)->orderBy('name', 'asc')->get(['id', 'name', 'email']);
            }
        }

        return Inertia::render('backend/commission/index', [
            'histories' => $histories,
            'stats' => $stats,
            'allowedMembers' => $allowedMembers,
            'request' => $request->all(),
            'currentUser' => $user,
        ]);
    }
}
