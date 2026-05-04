<?php

namespace App\Http\Controllers\Backend\V1\Post;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\PostCatalogue;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;

class QuotationController extends Controller
{
    /**
     * Display the quotation page with tabbed interface.
     *
     * @return Response
     */
    public function index(): Response
    {
        // Fetch the 'Báo Giá' catalogue and its posts
        $catalogue = PostCatalogue::whereHas('current_languages', function($q) {
            $q->where('post_catalogue_language.name', 'Báo Giá');
        })->first();

        if (!$catalogue) {
            return Inertia::render('backend/quotation/index', [
                'posts' => [],
            ]);
        }

        $posts = Post::where('post_catalogue_id', $catalogue->id)
            ->where('publish', 2)
            ->with(['current_languages'])
            ->orderBy('order', 'asc')
            ->get();

        return Inertia::render('backend/quotation/index', [
            'posts' => $posts,
        ]);
    }
}
