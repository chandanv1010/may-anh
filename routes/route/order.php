<?php  
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\V1\Order\OrderController;

Route::middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::group(['prefix' => 'backend', 'as' => 'order.'], function () {
        // OrderController chi co index/show/update. Route::resource day du con dang ky
        // them create/store/edit/destroy -> vao /backend/order/create la loi 500
        // "Call to undefined method OrderController::create()". Cung khong co trang
        // React resources/js/pages/backend/order/create.tsx nen route do vo nghia.
        // whereNumber la bat buoc: khong co no thi /backend/order/create van khop route
        // GET order/{order} va chuoi "create" bi nem vao show(int $id) -> van loi 500,
        // chi doi thong bao. Rang buoc id la so thi URL sai tra 404 dung nhu mong doi.
        Route::resource('order', OrderController::class)
            ->only(['index', 'show', 'update'])
            ->whereNumber('order');
    });
});
