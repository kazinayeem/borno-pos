<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Models\Tax;
use Database\Seeders\Concerns\InteractsWithDemoStores;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class ProductImageSeeder extends Seeder
{
    use InteractsWithDemoStores;

    public function run(): void
    {
        if ($this->refuseProduction()) {
            return;
        }

        $photos = json_decode((string) file_get_contents(database_path('seeders/demo-image-sources.json')), true);
        $byCategory = [];
        foreach ($photos['photos'] as $photo) {
            $path = $this->localPhoto($photo);
            foreach ($photo['categories'] as $category) {
                $byCategory[$category] = $path;
            }
        }

        $this->eachDemoStore(function ($store) use ($byCategory): void {
            $tax = Tax::query()->firstOrCreate(
                ['store_id' => $store->id, 'name' => 'VAT'],
                ['rate_bps' => 500],
            );

            foreach (Category::query()->orderBy('name')->get() as $category) {
                $path = $byCategory[$category->name] ?? $this->draw($category->name);
                Product::query()->where('category_id', $category->id)->whereNull('image')->update(['image' => $path]);
                Product::query()->where('category_id', $category->id)->whereNull('description')->update([
                    'description' => $category->name.' item sold at '.$store->name.'.',
                ]);
            }

            Product::query()->whereNull('tax_id')->whereRaw('id % 7 = 0')->update([
                'tax_id' => $tax->id,
                'tax_method' => 'exclusive',
            ]);

            if (! Setting::query()->where('key', 'demo.catalog_tuned')->exists()) {
                $ids = Product::query()->orderBy('id')->pluck('id');
                foreach ($ids as $index => $id) {
                    $product = Product::query()->find($id);
                    if (! $product) {
                        continue;
                    }
                    $changes = [];
                    if ($index % 23 === 22) {
                        $changes['is_active'] = false;
                        $changes['featured_in_pos'] = false;
                    }
                    if ($product->promo_price_cents === null && $index % 10 === 0 && $product->price_cents > $product->cost_cents + 40) {
                        $changes['promo_price_cents'] = $product->price_cents - 40;
                    }
                    if ($changes !== []) {
                        $product->update($changes);
                    }
                }
                Setting::query()->create(['store_id' => $store->id, 'key' => 'demo.catalog_tuned', 'value' => '1']);
            }

            if (ProductVariant::query()->count() < 2) {
                $hosts = Product::query()->orderBy('id')->limit(2)->get();
                foreach ($hosts as $host) {
                    $host->update(['has_variant' => true]);
                    ProductVariant::query()->firstOrCreate(
                        ['store_id' => $store->id, 'product_id' => $host->id, 'name' => 'Regular'],
                        ['sku' => $host->code.'-R', 'price_cents' => $host->price_cents, 'stock_qty' => 0],
                    );
                    ProductVariant::query()->firstOrCreate(
                        ['store_id' => $store->id, 'product_id' => $host->id, 'name' => 'Family'],
                        ['sku' => $host->code.'-F', 'price_cents' => $host->price_cents + 150, 'stock_qty' => 0],
                    );
                }
            }
        });
    }

    private function localPhoto(array $photo): string
    {
        $relative = 'products/demo/'.$photo['file'];
        if (Storage::disk('public')->exists($relative)) {
            return $relative;
        }

        $url = 'https://images.unsplash.com/photo-'.$photo['unsplash'].'?auto=format&fit=crop&w=480&q=60';
        try {
            $response = Http::timeout(12)
                ->withHeaders(['User-Agent' => 'BornoPosDemoSeeder'])
                ->get($url);
            $body = $response->body();
            if ($response->ok() && str_starts_with($body, "\xFF\xD8") && strlen($body) > 2000) {
                Storage::disk('public')->put($relative, $body);

                return $relative;
            }
        } catch (\Throwable) {
            // The drawn file below is the local fallback.
        }

        return $this->draw(pathinfo($photo['file'], PATHINFO_FILENAME), $relative);
    }

    private function draw(string $label, ?string $relative = null): string
    {
        $relative ??= 'products/demo/local-'.str($label)->slug().'.jpg';
        if (Storage::disk('public')->exists($relative)) {
            return $relative;
        }

        $image = imagecreatetruecolor(480, 320);
        $hue = abs(crc32($label)) % 360;
        [$red, $green, $blue] = $this->hsl($hue);
        imagefilledrectangle($image, 0, 0, 480, 320, imagecolorallocate($image, $red, $green, $blue));
        $ink = imagecolorallocate($image, 255, 255, 255);
        $font = '/System/Library/Fonts/Supplemental/Arial.ttf';
        if (is_file($font)) {
            imagettftext($image, 28, 0, 36, 170, $ink, $font, mb_substr($label, 0, 22));
        } else {
            imagestring($image, 5, 24, 150, substr($label, 0, 28), $ink);
        }
        ob_start();
        imagejpeg($image, null, 72);
        $bytes = ob_get_clean();
        imagedestroy($image);
        Storage::disk('public')->put($relative, $bytes);

        return $relative;
    }

    private function hsl(int $hue): array
    {
        $c = 0.45;
        $x = $c * (1 - abs(fmod($hue / 60, 2) - 1));
        $m = 0.35;
        [$r, $g, $b] = match (intdiv($hue, 60)) {
            0 => [$c, $x, 0],
            1 => [$x, $c, 0],
            2 => [0, $c, $x],
            3 => [0, $x, $c],
            4 => [$x, 0, $c],
            default => [$c, 0, $x],
        };

        return [(int) (($r + $m) * 255), (int) (($g + $m) * 255), (int) (($b + $m) * 255)];
    }
}
