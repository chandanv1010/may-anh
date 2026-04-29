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
                    'FUJI XT100' => [150, 200, 450],
                    'FUJI XT200' => [200, 250, 600],
                    'FUJI XA3' => [100, 150, 350],
                    'FUJI XA5' => [150, 200, 450],
                    'FUJI XT30' => [250, 300, 700],
                    'FUJI XM5' => [250, 300, 700],
                    'FUJI XS10' => [300, 400, 900],
                    'FUJI XS20' => [350, 450, 1050],
                    'FUJI X100V' => [350, 450, 1050],
                    'FUJI X100VI' => [450, 600, 1400],
                    'CANON M10' => [100, 150, 350],
                    'CANON G7X II' => [200, 250, 600],
                    'CANON R50' => [300, 400, 900],
                    'CANON M50' => [200, 250, 600],
                    'SONY ZV1' => [200, 250, 600],
                    'DJI POCKET 3' => [350, 450, 1050],
                    'DJI MINI 4 PRO' => [400, 550, 1300],
                ];

                foreach ($products as $prodName) {
                    $prices = $pricingMap[$prodName] ?? [0, 0, 0];
                    
                    // Create Product
                    $product = Product::create([
                        'product_catalogue_id' => $catalogue->id,
                        'publish' => 2,
                        'user_id' => $userId,
                        'order' => 0,
                        'sku' => strtoupper(Str::random(8)),
                        'price_6h' => $prices[0] * 1000,
                        'price_1d' => $prices[1] * 1000,
                        'price_3d' => $prices[2] * 1000,
                        'deposit' => 'Cọc CCCD gắn chip hoặc tiền mặt 2.000.000 VNĐ'
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
