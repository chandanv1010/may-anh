<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\ProductCatalogue;
use App\Models\Language;
use App\Models\Router;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class ProductSeeder extends Seeder
{
    public function run()
    {
        $languageId = 1; // Tiếng Việt
        $userId = 1;

        $categories = [
            'Canon' => [
                'CANON M10',
                'CANON G7X II',
                'CANON R50',
                'CANON M50'
            ],
            'Sony' => [
                'SONY ZV1'
            ],
            'DJI' => [
                'DJI POCKET 3',
                'DJI MINI 4 PRO'
            ],
            'FUJI' => [
                'FUJI XT100',
                'FUJI XT200',
                'FUJI XA3',
                'FUJI XA5',
                'FUJI XT30',
                'FUJI XM5',
                'FUJI XS10',
                'FUJI XS20',
                'FUJI X100V',
                'FUJI X100VI'
            ]
        ];

        DB::beginTransaction();
        try {
            foreach ($categories as $catName => $products) {
                // Create Category
                $catalogue = ProductCatalogue::create([
                    'parent_id' => 0,
                    'publish' => 2,
                    'user_id' => $userId,
                    'order' => 0,
                ]);

                $catSlug = Str::slug($catName);
                $catalogue->languages()->attach($languageId, [
                    'name' => $catName,
                    'canonical' => $catSlug,
                    'meta_title' => $catName,
                    'meta_keyword' => $catName,
                    'meta_description' => $catName,
                ]);

                // Create Router for Category
                Router::create([
                    'routerable_type' => ProductCatalogue::class,
                    'routerable_id' => $catalogue->id,
                    'canonical' => $catSlug,
                    'language_id' => $languageId,
                    'module' => 'product_catalogues',
                    'next_component' => 'ProductCataloguePage',
                    'controller' => 'App\Http\Controllers\Frontend\Product\ProductCatalogueController',
                ]);

                $pricingMap = [
                    'CANON M10' => [80, 120, 100, '2M + CCCD'],
                    'CANON G7X II' => [150, 200, 180, '2M + CCCD'],
                    'CANON R50' => [150, 220, 200, '3M + CCCD'],
                    'CANON M50' => [140, 180, 160, '3M + CCCD'],
                    'SONY ZV1' => [100, 150, 130, '3M + CCCD'],
                    'DJI POCKET 3' => [120, 160, 150, '3M + CCCD'],
                    'DJI MINI 4 PRO' => [400, 600, 500, '20M + CCCD'],
                    'FUJI XT100' => [120, 200, 180, '3M + CCCD'],
                    'FUJI XT200' => [150, 220, 200, '3M + CCCD'],
                    'FUJI XA3' => [90, 130, 120, '3M + CCCD'],
                    'FUJI XA5' => [150, 200, 180, '3M + CCCD'],
                    'FUJI XT30' => [180, 280, 220, '5M + CCCD'],
                    'FUJI XM5' => [200, 300, 250, '5M + CCCD'],
                    'FUJI XS10' => [220, 380, 320, '5M + CCCD'],
                    'FUJI XS20' => [250, 400, 350, '7M + CCCD'],
                    'FUJI X100V' => [250, 400, 350, '7M + CCCD'],
                    'FUJI X100VI' => [300, 450, 400, '10M + CCCD'],
                ];

                foreach ($products as $prodName) {
                    $config = $pricingMap[$prodName] ?? [0, 0, 0, ''];
                    
                    // Create Product
                    $product = Product::create([
                        'product_catalogue_id' => $catalogue->id,
                        'publish' => 2,
                        'user_id' => $userId,
                        'order' => 0,
                        'sku' => strtoupper(Str::random(8)),
                        'price_6h' => $config[0] * 1000,
                        'price_1d' => $config[1] * 1000,
                        'price_3d' => $config[2] * 1000,
                        'deposit' => $config[3]
                    ]);

                    $prodSlug = Str::slug($prodName);
                    $product->languages()->attach($languageId, [
                        'name' => $prodName,
                        'canonical' => $prodSlug,
                        'meta_title' => $prodName,
                        'meta_keyword' => $prodName,
                        'meta_description' => $prodName,
                    ]);

                    // Link to Category
                    $product->product_catalogues()->attach($catalogue->id);

                    // Create Router for Product
                    Router::create([
                        'routerable_type' => Product::class,
                        'routerable_id' => $product->id,
                        'canonical' => $prodSlug,
                        'language_id' => $languageId,
                        'module' => 'products',
                        'next_component' => 'ProductDetail',
                        'controller' => 'App\Http\Controllers\Frontend\Product\ProductController',
                    ]);
                }
            }
            DB::commit();
            $this->command->info('ProductSeeder completed successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('ProductSeeder failed: ' . $e->getMessage());
        }
    }
}
