<?php

use App\Http\Controllers\Backend\V1\Setting\SystemCatalogueController;
use App\Http\Controllers\Backend\V1\Setting\SystemController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'setBackendLocale'])->prefix('backend')->name('backend.')->group(function () {
    
    // System Catalogue Management
    // SystemCatalogueController chi co index/store/update/destroy. except(['show']) van
    // dang ky create va edit -> /backend/system/catalogue/create loi 500. Trang React
    // cung chi co index.tsx, viec them/sua lam ngay trong modal cua trang index.
    Route::resource('system/catalogue', SystemCatalogueController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->whereNumber('catalogue');
    Route::patch('system/catalogue', [SystemCatalogueController::class, 'bulkUpdate'])->name('system.catalogue.bulkUpdate');
    Route::patch('system/catalogue/{id}/toggle/{field}', [SystemCatalogueController::class, 'toggle'])->name('system.catalogue.toggle');
    
    // System Config Management (Nested under catalogue or separate?)
    // Let's allow access to systems of a catalogue
    Route::get('system/catalogue/{id}/systems', [SystemController::class, 'index'])->name('system.config.index');
    Route::post('system/config', [SystemController::class, 'store'])->name('system.config.store');
    Route::put('system/config', [SystemController::class, 'bulkUpdate'])->name('system.config.bulkUpdate');
    Route::patch('system/config', [SystemController::class, 'bulkUpdate'])->name('system.config.bulkUpdate');
    Route::put('system/config/{id}', [SystemController::class, 'update'])->name('system.config.update');
    Route::patch('system/config/{id}/toggle/{field}', [SystemController::class, 'toggle'])->name('system.config.toggle');
    Route::delete('system/config', [SystemController::class, 'bulkDestroy'])->name('system.config.bulkDestroy');
    Route::delete('system/config/{id}', [SystemController::class, 'destroy'])->name('system.config.destroy');

});
