<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CleanOrphanedRecords extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:clean-orphaned {--force : Force delete without asking}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Kiểm tra và xóa các dữ liệu mồ côi (orphaned records) bị lỗi khóa ngoại (foreign key constraint) trong toàn bộ Database.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Đang kiểm tra toàn bộ database để tìm orphaned records...");

        try {
            $tables = Schema::getTables();
            $force = $this->option('force');
            $foundAny = false;

            foreach ($tables as $table) {
                $tableName = $table['name'];
                $foreignKeys = Schema::getForeignKeys($tableName);

                foreach ($foreignKeys as $fk) {
                    $localColumns = $fk['columns'];
                    $foreignTable = $fk['foreign_table'];
                    $foreignColumns = $fk['foreign_columns'];

                    if (empty($localColumns) || empty($foreignColumns)) {
                        continue;
                    }

                    // For simplicity, we handle the first column of the foreign key constraint
                    $localCol = $localColumns[0];
                    $foreignCol = $foreignColumns[0];

                    $orphansQuery = DB::table($tableName)
                        ->whereNotNull($localCol)
                        ->whereNotExists(function ($query) use ($foreignTable, $foreignCol, $tableName, $localCol) {
                            $query->select(DB::raw(1))
                                  ->from($foreignTable)
                                  ->whereColumn("$foreignTable.$foreignCol", "$tableName.$localCol");
                        });

                    // Fetch IDs of orphaned records to avoid MySQL Error 1093 (cannot delete from table while selecting from same table)
                    $primaryKey = 'id'; // Assuming 'id' is the primary key for most tables
                    if (!Schema::hasColumn($tableName, 'id')) {
                        // If no 'id', we just fetch the offending local columns
                        $orphanedRecords = $orphansQuery->get([$localCol])->pluck($localCol)->toArray();
                        $orphansCount = count($orphanedRecords);
                    } else {
                        $orphanedRecords = $orphansQuery->pluck('id')->toArray();
                        $orphansCount = count($orphanedRecords);
                    }

                    if ($orphansCount > 0) {
                        $foundAny = true;
                        $this->warn("Phát hiện $orphansCount bản ghi lỗi trong bảng '{$tableName}' (cột '{$localCol}' trỏ tới '{$foreignTable}.{$foreignCol}' không tồn tại).");

                        if ($force || $this->confirm("Bạn có muốn XÓA $orphansCount bản ghi lỗi này trong bảng '{$tableName}' không?", true)) {
                            // Tắt kiểm tra khóa ngoại tạm thời để tránh lỗi cascade loop
                            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
                            
                            if (!Schema::hasColumn($tableName, 'id')) {
                                DB::table($tableName)->whereIn($localCol, $orphanedRecords)->delete();
                            } else {
                                // Chunking if there are many records
                                foreach (array_chunk($orphanedRecords, 1000) as $chunk) {
                                    DB::table($tableName)->whereIn('id', $chunk)->delete();
                                }
                            }
                            
                            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
                            $this->info(" Đã xóa thành công $orphansCount bản ghi khỏi bảng '{$tableName}'.");
                        }
                    }
                }
            }

            if (!$foundAny) {
                $this->info("Tuyệt vời! Không phát hiện bản ghi lỗi khóa ngoại nào trong toàn bộ database.");
            } else {
                $this->info("Đã hoàn tất kiểm tra database.");
            }

        } catch (\Exception $e) {
            $this->error("Lỗi: " . $e->getMessage());
        }
    }
}
