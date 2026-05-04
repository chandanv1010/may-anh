<?php

use App\Http\Controllers\Backend\V1\DashboardController;
use App\Http\Controllers\Backend\V1\Image\ImageTempController;
use App\Http\Controllers\Media\ThumbnailController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Models\Product;

use App\Http\Controllers\Frontend\HomeController;

// Redirect / to backend login
Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

// Public thumbnail endpoint for CKFinder/userfiles images
Route::get('/thumb', ThumbnailController::class)->name('media.thumb');

// Language Switcher Route
Route::get('language-switch/{locale}', function ($locale) {
    session()->put('app_locale', $locale);
    return back();
})->name('language.switch');

// Backend routes...
Route::middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('upload-image-temp', [ImageTempController::class, 'upload'])->name('upload.temp');
    Route::delete('upload-image-temp/{id}', [ImageTempController::class, 'destroy'])->where('id', '.*')->name('upload.destroy');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/route/translate.php';
require __DIR__.'/route/user.php';
require __DIR__.'/route/setting.php';
require __DIR__.'/route/system.php';
require __DIR__.'/route/tax_setting.php';
require __DIR__.'/route/router.php';
require __DIR__.'/route/post.php';
require __DIR__.'/route/product.php';
require __DIR__.'/route/core.php';
require __DIR__.'/route/warehouse.php';
require __DIR__.'/route/customer.php';
require __DIR__.'/route/payment_method.php';
require __DIR__.'/route/quote.php';
require __DIR__.'/route/promotion.php';
require __DIR__.'/route/voucher.php';
require __DIR__.'/route/cash_book.php';
require __DIR__.'/route/menu.php';
require __DIR__.'/route/order.php';
require __DIR__.'/route/banner.php';
require __DIR__.'/route/review.php';
require __DIR__.'/route/widget.php';
require __DIR__.'/route/booking.php';

/* 
// Disable Frontend routes
use App\Http\Controllers\Frontend\Cart\CartController;
use App\Http\Controllers\Frontend\Auth\Customer\LoginController as CustomerLogin;
use App\Http\Controllers\Frontend\Auth\Customer\RegisterController as CustomerRegister;
use App\Http\Controllers\Frontend\Auth\Customer\LogoutController as CustomerLogout;
use App\Http\Controllers\Frontend\Customer\ProfileController;
use App\Http\Controllers\Frontend\Checkout\CheckoutController;

Route::middleware('guest:customer')->group(function () {
    Route::get('signin', [CustomerLogin::class, 'show'])->name('signin');
    ...
});
...
*/

// Fallback for 404
Route::get('404', function () {
    return Inertia::render('frontend/not-found');
})->name('404');
