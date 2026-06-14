<?php

use App\Http\Controllers\Backend\V1\Commission\CommissionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'setBackendLocale'])->prefix('backend')->name('backend.')->group(function () {
    
    // Commission Management
    Route::get('commission', [CommissionController::class, 'index'])->name('commission.index');

});
