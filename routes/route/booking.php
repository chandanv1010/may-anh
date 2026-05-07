<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\V1\Booking\BookingController;

Route::middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::get('/backend/booking/index', [BookingController::class, 'index'])->name('booking.index');
    Route::get('/backend/booking/calendar', [BookingController::class, 'calendar'])->name('booking.calendar');
    Route::get('/backend/booking/statistics', [BookingController::class, 'statistics'])->name('booking.statistics');
    Route::get('/backend/booking/search-customer', [BookingController::class, 'searchCustomer'])->name('booking.search_customer');
    Route::post('/backend/booking/store', [BookingController::class, 'store'])->name('booking.store');
    Route::post('/backend/booking/update/{id}', [BookingController::class, 'update'])->name('booking.update');
});
