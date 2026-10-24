<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Currency;
use App\Models\Customer;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Payroll;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\UserNotice;
use App\Models\Warehouse;
use App\Services\CheckoutService;
use App\Services\LedgerService;
use App\Services\PurchaseService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Auth;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command?->warn('Demo seeding is disabled when APP_ENV is production.');

            return;
        }

        if (User::query()->where('email', 'superadmin@bornopos.test')->exists()) {
            $this->fillExistingShops();
            $this->enrich();

            return;
        }

        Currency::query()->insert([
            ['name' => 'US Dollar', 'code' => 'USD', 'symbol' => '$', 'rate_bps' => 10000, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Bangladeshi Taka', 'code' => 'BDT', 'symbol' => '৳', 'rate_bps' => 1100000, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Plan::query()->insert([
            ['name' => 'Starter', 'price_cents' => 0, 'interval' => 'month', 'features' => 'POS, products, and one store.', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Shop', 'price_cents' => 2900, 'interval' => 'month', 'features' => 'Purchases, reports, and payroll.', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Multi-store', 'price_cents' => 7900, 'interval' => 'month', 'features' => 'Branches and a super admin view.', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@bornopos.test',
            'username' => 'superadmin',
            'password' => config('bornopos.demo_password'),
            'role' => 'super_admin',
        ]);

        $shops = [
            'all_in_one' => ['All in One Mart', 'allinone@bornopos.test'],
            'grocery' => ['Super Shop', 'grocery@bornopos.test'],
            'pharmacy' => ['City Pharmacy', 'pharmacy@bornopos.test'],
            'electronics' => ['Mobile House', 'electronics@bornopos.test'],
            'restaurant' => ['Borno Kitchen', 'restaurant@bornopos.test'],
        ];

        foreach ($shops as $type => [$name, $email]) {
            $this->shop($type, $name, $email);
        }

        $this->enrich();
    }

    private function enrich(): void
    {
        $this->call([
            UserSeeder::class,
            PeopleSeeder::class,
            ProductImageSeeder::class,
            SalesSeeder::class,
            AccountingSeeder::class,
            SettingsSeeder::class,
            TrackingExampleSeeder::class,
        ]);
    }

    private function fillExistingShops(): void
    {
        foreach (Store::query()->get() as $store) {
            $owner = User::query()->where('store_id', $store->id)->where('role', 'owner')->first();
            if (! $owner) {
                continue;
            }
            Auth::login($owner);
            $this->addCatalog($store, $owner);
            Auth::logout();
        }
    }

    private function shop(string $type, string $name, string $email): void
    {
        $store = Store::create([
            'name' => $name,
            'slug' => str($name)->slug().'-'.$type,
            'business_type' => $type,
            'email' => $email,
            'currency_code' => 'USD',
            'currency_symbol' => '$',
        ]);
        $owner = User::create([
            'name' => 'Admin',
            'email' => $email,
            'username' => str($email)->before('@'),
            'password' => config('bornopos.demo_password'),
            'role' => 'owner',
            'store_id' => $store->id,
        ]);
        $store->update(['owner_id' => $owner->id]);
        if ($type === 'all_in_one') {
            User::create([
                'name' => 'Cashier',
                'email' => 'cashier@bornopos.test',
                'username' => 'cashier',
                'password' => config('bornopos.demo_password'),
                'role' => 'staff',
                'store_id' => $store->id,
                'permissions' => ['pos', 'products.view', 'sales.view'],
            ]);
        }
        $warehouse = Warehouse::create(['store_id' => $store->id, 'name' => 'Main Warehouse']);
        Account::create(['store_id' => $store->id, 'name' => 'Cash', 'number' => 'CASH-001', 'type' => 'cash', 'is_default' => true, 'opening_cents' => 500000]);
        foreach (['Piece' => 'pc', 'Kg' => 'kg', 'Litre' => 'L', 'Pack' => 'pk', 'Box' => 'bx'] as $unitName => $short) {
            Unit::firstOrCreate(['store_id' => $store->id, 'name' => $unitName], ['short_name' => $short]);
        }
        foreach (['House', 'Local', 'Premium', 'Fresh', 'Select', 'Daily'] as $brandName) {
            Brand::firstOrCreate(['store_id' => $store->id, 'name' => $brandName]);
        }
        $supplier = Supplier::firstOrCreate(
            ['store_id' => $store->id, 'name' => $name.' Supplier'],
            ['phone' => '01700000000'],
        );
        Customer::firstOrCreate(['store_id' => $store->id, 'name' => 'Walk-in Regular'], ['phone' => '01800000000']);
        UserNotice::firstOrCreate(
            ['user_id' => $owner->id, 'title' => 'Welcome to '.$name],
            ['body' => 'Demo data is ready for POS, purchases, and reports.'],
        );

        Auth::login($owner);
        $this->addCatalog($store, $owner);

        $first = Product::query()->where('stock_qty', '>', 0)->first();
        app(CheckoutService::class)->checkout($owner, [
            'status' => 'completed',
            'payment_method' => 'Cash',
            'amount_paid' => number_format($first->price_cents / 100, 2, '.', ''),
            'discount' => '0',
            'idempotency_key' => 'seed-'.$store->id,
        ], [['product_id' => $first->id, 'qty' => 1]]);

        if ($type === 'all_in_one') {
            $category = ExpenseCategory::create(['store_id' => $store->id, 'name' => 'Rent']);
            $department = Department::create(['store_id' => $store->id, 'name' => 'Sales']);
            $employee = Employee::create(['store_id' => $store->id, 'department_id' => $department->id, 'name' => 'Karim', 'salary_cents' => 20000]);
            $expense = Expense::create([
                'store_id' => $store->id,
                'expense_category_id' => $category->id,
                'user_id' => $owner->id,
                'spent_on' => now()->toDateString(),
                'amount_cents' => 100000,
                'note' => 'Counter rent',
            ]);
            app(LedgerService::class)->post(
                Account::where('is_default', true)->first(),
                'credit',
                100000,
                'expense:'.$expense->id,
                'Expense',
                $expense,
                now(),
                $owner,
            );
            $payroll = Payroll::create([
                'store_id' => $store->id,
                'employee_id' => $employee->id,
                'user_id' => $owner->id,
                'month' => now()->format('Y-m'),
                'amount_cents' => 20000,
                'paid_on' => now()->toDateString(),
            ]);
            app(LedgerService::class)->post(
                Account::where('is_default', true)->first(),
                'credit',
                20000,
                'payroll:'.$payroll->id,
                'Salary',
                $payroll,
                now(),
                $owner,
            );
        }
        Auth::logout();
    }

    private function addCatalog(Store $store, User $owner): void
    {
        $target = 220;
        if (Product::query()->count() >= $target) {
            return;
        }

        $warehouse = Warehouse::query()->first()
            ?? Warehouse::create(['store_id' => $store->id, 'name' => 'Main Warehouse']);
        $supplier = Supplier::query()->first();
        foreach (['Piece' => 'pc', 'Kg' => 'kg', 'Litre' => 'L', 'Pack' => 'pk', 'Box' => 'bx'] as $unitName => $short) {
            Unit::firstOrCreate(['store_id' => $store->id, 'name' => $unitName], ['short_name' => $short]);
        }
        foreach (['House', 'Local', 'Premium', 'Fresh', 'Select', 'Daily'] as $brandName) {
            Brand::firstOrCreate(['store_id' => $store->id, 'name' => $brandName]);
        }
        foreach (['Rahim', 'Karim', 'Ayesha', 'Nusrat', 'Jamal', 'Rina', 'Hasan', 'Mitu'] as $index => $person) {
            Customer::firstOrCreate(
                ['store_id' => $store->id, 'name' => $person],
                ['phone' => '018100000'.$index],
            );
        }

        $units = Unit::query()->get()->values();
        $brands = Brand::query()->get()->values();
        $prefix = strtoupper(substr($store->business_type, 0, 3));
        $lines = [];
        $index = Product::query()->count();

        foreach ($this->catalogRows($store->business_type) as [$productName, $categoryName]) {
            if (Product::query()->count() >= $target) {
                break;
            }
            $index++;
            $code = $prefix.str_pad((string) $index, 4, '0', STR_PAD_LEFT);
            if (Product::query()->where('code', $code)->exists()) {
                continue;
            }
            $category = Category::firstOrCreate(['store_id' => $store->id, 'name' => $categoryName]);
            $cost = 80 + (($index * 137) % 9000);
            $price = $cost + 60 + (($index * 53) % 2500);
            $product = Product::create([
                'store_id' => $store->id,
                'name' => $productName,
                'code' => $code,
                'category_id' => $category->id,
                'brand_id' => $brands[$index % $brands->count()]->id,
                'unit_id' => $units[$index % $units->count()]->id,
                'warehouse_id' => $warehouse->id,
                'cost_cents' => $cost,
                'price_cents' => $price,
                'alert_qty' => 5,
                'featured_in_pos' => true,
                'has_batch' => $store->business_type === 'pharmacy',
            ]);
            $qty = $index % 8 === 0 ? 0 : (6 + ($index % 40));
            if ($qty < 1) {
                continue;
            }
            $lines[] = [
                'product_id' => $product->id,
                'qty' => $qty,
                'cost' => number_format($cost / 100, 2, '.', ''),
                'batch_no' => $store->business_type === 'pharmacy' ? 'B-'.$code : null,
                'expiry_date' => $store->business_type === 'pharmacy' ? now()->addMonths(14)->toDateString() : null,
            ];
        }

        foreach (array_chunk($lines, 40) as $chunk => $chunkLines) {
            app(PurchaseService::class)->receive($owner, [
                'warehouse_id' => $warehouse->id,
                'supplier_id' => $supplier?->id,
                'purchased_on' => now()->toDateString(),
                'reference' => 'PO-'.$store->id.'-C'.$chunk.'-'.now()->format('YmdHis'),
                'payment_method' => 'Cash',
                'amount_paid' => '0',
                'tax' => '0',
                'discount' => '0',
                'shipping' => '0',
            ], $chunkLines);
        }
    }

    /**
     * @return array<int, array{0: string, 1: string}>
     */
    private function catalogRows(string $type): array
    {
        $books = [
            'grocery' => [
                'Rice & Grains' => ['Miniket Rice', 'Basmati Rice', 'Polao Rice', 'Wheat Flour', 'Semolina', 'Oats', 'Lentil', 'Chickpeas', 'Mung Beans', 'Flattened Rice'],
                'Dairy' => ['Milk', 'Yogurt', 'Butter', 'Cheese', 'Cream', 'Ghee', 'Paneer', 'Curd', 'Milk Powder', 'Lassi'],
                'Beverages' => ['Orange Juice', 'Mango Juice', 'Mineral Water', 'Black Tea', 'Green Tea', 'Coffee', 'Soft Drink', 'Coconut Water', 'Energy Drink', 'Lemon Drink'],
                'Snacks' => ['Potato Chips', 'Chanachur', 'Biscuits', 'Noodles', 'Popcorn', 'Peanuts', 'Chocolate', 'Cake', 'Crackers', 'Nuts Mix'],
                'Produce' => ['Potato', 'Onion', 'Tomato', 'Garlic', 'Ginger', 'Green Chili', 'Carrot', 'Cucumber', 'Banana', 'Apple'],
                'Frozen' => ['Chicken Nuggets', 'French Fries', 'Fish Fillet', 'Paratha', 'Samosa', 'Vegetables Mix', 'Ice Cream', 'Peas', 'Corn', 'Kebab'],
                'Household' => ['Dish Wash', 'Laundry Powder', 'Floor Cleaner', 'Tissue', 'Trash Bags', 'Soap', 'Shampoo', 'Toothpaste', 'Detergent Bar', 'Air Freshener'],
                'Spices' => ['Turmeric', 'Chili Powder', 'Cumin', 'Coriander', 'Salt', 'Sugar', 'Mustard Oil', 'Soybean Oil', 'Garam Masala', 'Bay Leaf'],
                'Breakfast' => ['Corn Flakes', 'Honey', 'Jam', 'Bread', 'Eggs', 'Peanut Butter', 'Oat Cookies', 'Mayonnaise', 'Sauce', 'Pickle'],
                'Baby' => ['Baby Lotion', 'Diapers', 'Baby Wipes', 'Baby Oil', 'Cerelac', 'Feeding Bottle', 'Baby Soap', 'Baby Shampoo', 'Baby Powder', 'Rusk'],
                'Personal Care' => ['Face Wash', 'Hand Wash', 'Body Lotion', 'Hair Oil', 'Razor', 'Sanitary Pad', 'Deodorant', 'Sunscreen', 'Mouthwash', 'Cotton'],
                'Canned' => ['Baked Beans', 'Tomato Paste', 'Tuna', 'Sweet Corn', 'Mushroom', 'Coconut Milk', 'Condensed Milk', 'Fruit Cocktail', 'Olives', 'Soup'],
            ],
            'pharmacy' => [
                'Pain Relief' => ['Paracetamol', 'Ibuprofen', 'Aspirin', 'Diclofenac Gel', 'Muscle Rub', 'Hot Patch', 'Cold Patch', 'Pain Balm', 'Oral Gel', 'Spray'],
                'Cold & Flu' => ['Cough Syrup', 'Antihistamine', 'Nasal Spray', 'Throat Lozenges', 'Vapor Rub', 'Steam Capsule', 'Saline Drop', 'Vitamin Drink', 'Mask Pack', 'Thermometer'],
                'Vitamins' => ['Vitamin C', 'Vitamin D', 'Vitamin B Complex', 'Calcium', 'Zinc', 'Iron', 'Omega 3', 'Multivitamin', 'Folic Acid', 'Magnesium'],
                'First Aid' => ['Bandage', 'Cotton Roll', 'Antiseptic', 'Gauze', 'Medical Tape', 'Gloves', 'Scissors', 'Burn Cream', 'Alcohol Pad', 'Ice Bag'],
                'Skin' => ['Antiseptic Cream', 'Calamine', 'Moisturizer', 'Antifungal Cream', 'Lip Balm', 'Hand Cream', 'Aloe Gel', 'Powder', 'Soap Bar', 'Face Cream'],
                'Diabetes Care' => ['Glucose Strips', 'Lancets', 'Meter Battery', 'Sugar Free Sweetener', 'Diabetic Socks', 'Ketone Strips', 'Sharps Box', 'Alcohol Swab', 'Log Book', 'Carry Case'],
                'Baby Care' => ['Gripe Water', 'Baby Drops', 'ORS', 'Teether', 'Nasal Aspirator', 'Baby Thermometer', 'Barrier Cream', 'Cotton Buds', 'Nail Clipper', 'Medicine Spoon'],
                'Devices' => ['BP Monitor', 'Pulse Oximeter', 'Nebulizer Mask', 'Heating Pad', 'Weighing Scale', 'Pill Box', 'Walker Tip', 'Support Belt', 'Knee Brace', 'Wrist Brace'],
                'Eye & Ear' => ['Eye Drop', 'Ear Drop', 'Lens Solution', 'Eye Wash', 'Cotton Eye Pad', 'Reading Glass Case', 'Ear Plugs', 'Lens Cloth', 'Dropper', 'Eye Mask'],
                'Digestive' => ['Antacid', 'ORS Saline', 'Probiotic', 'Enzyme Tablet', 'Lactose Drops', 'Fiber Sachet', 'Hydration Sachet', 'Mint Tablet', 'Ginger Capsule', 'Isabgol'],
                'Oral Care' => ['Toothbrush', 'Sensitive Paste', 'Dental Floss', 'Mouth Gel', 'Tongue Cleaner', 'Kids Paste', 'Whitening Paste', 'Interdental Brush', 'Mouth Rinse', 'Denture Box'],
                'Wellness' => ['Hand Sanitizer', 'Digital Thermometer', 'Hot Water Bag', 'Vaporizer', 'Compression Sock', 'Posture Belt', 'Massage Oil', 'Sleep Mask', 'Humidifier Tablet', 'Herbal Tea'],
            ],
            'electronics' => [
                'Cables' => ['USB Cable', 'Type-C Cable', 'Lightning Cable', 'HDMI Cable', 'AUX Cable', 'Ethernet Cable', 'Power Cord', 'OTG Cable', 'Extension Cord', 'Charger Cable'],
                'Audio' => ['Earphones', 'Neckband', 'Speaker', 'Soundbar', 'Microphone', 'Headset', 'Earbuds Case', 'Audio Splitter', 'FM Transmitter', 'Karaoke Mic'],
                'Chargers' => ['Wall Charger', 'Car Charger', 'Wireless Pad', 'Power Bank', 'Laptop Adapter', 'Multi Plug', 'GaN Charger', 'Watch Charger', 'Camera Charger', 'Battery Pack'],
                'Mobile' => ['Phone Case', 'Screen Guard', 'SIM Tool', 'Pop Socket', 'Ring Holder', 'Selfie Stick', 'Phone Stand', 'Camera Lens Clip', 'Stylus', 'Lanyard'],
                'Storage' => ['Pendrive', 'Memory Card', 'Card Reader', 'SSD Enclosure', 'Hard Disk Case', 'OTG Pendrive', 'SD Adapter', 'Backup Drive Case', 'USB Hub', 'Dock'],
                'Computer' => ['Mouse', 'Keyboard', 'Mouse Pad', 'Webcam', 'Laptop Stand', 'Cooling Pad', 'HDMI Adapter', 'USB Adapter', 'Monitor Arm', 'Cable Tie'],
                'Home' => ['LED Bulb', 'Extension Board', 'Night Lamp', 'Smart Plug', 'Torch', 'Fan Regulator', 'Door Bell', 'Remote', 'Battery Cell', 'Adapter'],
                'Wearables' => ['Smart Band', 'Watch Strap', 'Earbud Hooks', 'Fitness Clip', 'Arm Band', 'Chest Strap', 'Screen Film', 'Charging Puck', 'Travel Case', 'Lens Kit'],
                'Camera' => ['Tripod', 'Memory Wallet', 'Lens Cap', 'Cleaning Kit', 'Mini Tripod', 'Phone Gimbal Grip', 'Light Panel', 'Reflector', 'Camera Bag', 'Strap'],
                'Networking' => ['Wi-Fi Adapter', 'Range Extender', 'LAN Tester', 'RJ45 Jacks', 'Router Stand', 'Antenna', 'PoE Injector', 'Switch 5 Port', 'Cable Clips', 'Keystone'],
                'Office' => ['Label Printer Roll', 'Barcode Scanner Stand', 'Receipt Roll', 'Cash Drawer Cable', 'POS Stand', 'Customer Display Cable', 'Keyboard Cover', 'Wrist Rest', 'Document Camera', 'Presenter'],
                'Accessories' => ['Screen Cleaner', 'Cable Organizer', 'Laptop Sleeve', 'Backpack', 'Phone Grip', 'Car Mount', 'Desk Mat', 'Monitor Light', 'USB Light', 'Privacy Filter'],
            ],
            'restaurant' => [
                'Meals' => ['Chicken Biryani', 'Beef Tehari', 'Mutton Kacchi', 'Fried Rice', 'Chicken Curry', 'Fish Curry', 'Vegetable Curry', 'Khichuri', 'Egg Curry', 'Dal'],
                'Grill' => ['Chicken Grill', 'Beef Seekh', 'Chicken Tikka', 'Fish Fry', 'Kebab Roll', 'Shawarma', 'Paneer Tikka', 'Wings', 'Steak Bites', 'Mixed Grill'],
                'Rice' => ['Plain Rice', 'Polao', 'Jeera Rice', 'Egg Fried Rice', 'Chicken Fried Rice', 'Vegetable Rice', 'Biryani Rice', 'Khichuri Bowl', 'Rice Bowl', 'Sticky Rice'],
                'Bread' => ['Naan', 'Roti', 'Paratha', 'Garlic Naan', 'Butter Naan', 'Rumali', 'Kulcha', 'Bun', 'Garlic Bread', 'Cheese Naan'],
                'Drinks' => ['Lime Soda', 'Lassi', 'Mango Shake', 'Lemonade', 'Iced Tea', 'Coffee', 'Mineral Water', 'Borhani', 'Orange Juice', 'Soft Drink'],
                'Desserts' => ['Firni', 'Roshogolla', 'Brownie', 'Ice Cream', 'Custard', 'Gulab Jamun', 'Pudding', 'Fruit Salad', 'Kheer', 'Cheesecake'],
                'Sides' => ['French Fries', 'Salad', 'Raita', 'Papad', 'Pickle', 'Soup', 'Coleslaw', 'Onion Rings', 'Mashed Potato', 'Corn'],
                'Breakfast' => ['Paratha Set', 'Omelette', 'Bhuna Khichuri', 'Poha', 'Pancake', 'Sandwich', 'Halwa', 'Bread Omelette', 'Suji', 'Chola'],
                'Soups' => ['Chicken Soup', 'Thai Soup', 'Corn Soup', 'Tomato Soup', 'Lentil Soup', 'Hot and Sour', 'Mushroom Soup', 'Veg Clear Soup', 'Noodle Soup', 'Pumpkin Soup'],
                'Salads' => ['Green Salad', 'Chicken Salad', 'Fruit Salad Bowl', 'Cucumber Salad', 'Pasta Salad', 'Egg Salad', 'Bean Salad', 'Coleslaw Bowl', 'Sprout Salad', 'Garden Salad'],
                'Snacks' => ['Samosa', 'Singara', 'Spring Roll', 'Chicken Cutlet', 'French Toast', 'Nachos', 'Popcorn Chicken', 'Cheese Balls', 'Fish Finger', 'Veg Pakora'],
                'Combo' => ['Lunch Combo', 'Family Platter', 'Kids Meal', 'Iftar Box', 'Office Lunch', 'Couple Set', 'Grill Combo', 'Rice Combo', 'Burger Combo', 'Breakfast Combo'],
            ],
        ];
        $books['all_in_one'] = $books['grocery'] + [
            'Stationery' => ['Notebook', 'Pen', 'Pencil', 'Eraser', 'Sharpener', 'Marker', 'Stapler', 'File', 'Glue', 'Scale'],
            'General' => ['Match Box', 'Candle', 'Battery', 'Mosquito Coil', 'Insect Spray', 'Umbrella', 'Slippers', 'Bucket', 'Mug', 'Lock'],
        ];

        $rows = [];
        foreach ($books[$type] ?? $books['grocery'] as $category => $names) {
            foreach ($names as $name) {
                $rows[] = [$name, $category];
            }
        }
        $extra = [];
        foreach (['250g', '500g', '1kg', '2kg', 'Family pack'] as $size) {
            foreach ($rows as [$name, $category]) {
                $extra[] = [$name.' '.$size, $category];
                if (count($rows) + count($extra) >= 260) {
                    break 2;
                }
            }
        }

        return array_merge($rows, $extra);
    }
}
