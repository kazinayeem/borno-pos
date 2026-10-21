# BornoPos

Laravel point-of-sale and shop workspace using SQLite.

## Run locally

```bash
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

Open `http://127.0.0.1:8000`.

Demo password is the `DEMO_PASSWORD` value (default `password`).

| Shop | Email |
| --- | --- |
| All in one | allinone@bornopos.test |
| Grocery | grocery@bornopos.test |
| Pharmacy | pharmacy@bornopos.test |
| Electronics | electronics@bornopos.test |
| Restaurant | restaurant@bornopos.test |
| Super admin | superadmin@bornopos.test |
| Cashier (POS only) | cashier@bornopos.test |

Money is stored as integer cents. Purchases increase stock. POS checkout writes the sale, payment, and stock change in one database transaction.
