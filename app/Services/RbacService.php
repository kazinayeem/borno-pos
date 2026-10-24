<?php

namespace App\Services;

use App\Models\ShopRole;
use App\Models\Store;

class RbacService
{
    /**
     * Get the master permission schema grouped by module.
     *
     * @return array<int, array{module: string, label: string, actions: array<string, string>}>
     */
    public function getModules(): array
    {
        return [
            [
                'module' => 'dashboard',
                'label' => 'Dashboard',
                'actions' => [
                    'view' => 'dashboard.view',
                ],
            ],
            [
                'module' => 'products',
                'label' => 'Products & Catalog',
                'actions' => [
                    'view' => 'products.view',
                    'create' => 'products.create',
                    'edit' => 'products.edit',
                    'delete' => 'products.delete',
                ],
            ],
            [
                'module' => 'pos',
                'label' => 'Point of Sale (POS)',
                'actions' => [
                    'view' => 'pos.view',
                    'create' => 'pos.create',
                ],
            ],
            [
                'module' => 'sales',
                'label' => 'Sales & Orders',
                'actions' => [
                    'view' => 'sales.view',
                    'create' => 'sales.create',
                    'edit' => 'sales.edit',
                    'delete' => 'sales.delete',
                ],
            ],
            [
                'module' => 'purchases',
                'label' => 'Purchases & Stock',
                'actions' => [
                    'view' => 'purchases.view',
                    'create' => 'purchases.create',
                    'edit' => 'purchases.edit',
                    'delete' => 'purchases.delete',
                ],
            ],
            [
                'module' => 'accounting',
                'label' => 'Accounting & Finance',
                'actions' => [
                    'view' => 'accounting.view',
                    'create' => 'accounting.create',
                    'edit' => 'accounting.edit',
                    'delete' => 'accounting.delete',
                ],
            ],
            [
                'module' => 'reports',
                'label' => 'Reports & Analytics',
                'actions' => [
                    'view' => 'reports.view',
                ],
            ],
            [
                'module' => 'staff',
                'label' => 'Staff Management',
                'actions' => [
                    'view' => 'staff.view',
                    'create' => 'staff.create',
                    'edit' => 'staff.edit',
                    'delete' => 'staff.delete',
                ],
            ],
            [
                'module' => 'roles',
                'label' => 'Role Management',
                'actions' => [
                    'view' => 'roles.view',
                    'create' => 'roles.create',
                    'edit' => 'roles.edit',
                    'delete' => 'roles.delete',
                ],
            ],
            [
                'module' => 'customers',
                'label' => 'Customers',
                'actions' => [
                    'view' => 'customers.view',
                    'create' => 'customers.create',
                    'edit' => 'customers.edit',
                    'delete' => 'customers.delete',
                ],
            ],
            [
                'module' => 'suppliers',
                'label' => 'Suppliers',
                'actions' => [
                    'view' => 'suppliers.view',
                    'create' => 'suppliers.create',
                    'edit' => 'suppliers.edit',
                    'delete' => 'suppliers.delete',
                ],
            ],
            [
                'module' => 'settings',
                'label' => 'Store Settings',
                'actions' => [
                    'view' => 'settings.view',
                    'edit' => 'settings.edit',
                ],
            ],
        ];
    }

    /**
     * Get a flat list of all valid permission keys.
     *
     * @return array<int, string>
     */
    public function getAllPermissionSlugs(): array
    {
        $slugs = [];
        foreach ($this->getModules() as $module) {
            foreach ($module['actions'] as $slug) {
                $slugs[] = $slug;
            }
        }

        return $slugs;
    }

    /**
     * Seed or ensure default system roles for a specific store.
    /**
     * Get templates for the 6 default system roles.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getDefaultRoleTemplates(): array
    {
        $all = $this->getAllPermissionSlugs();

        return [
            [
                'name' => 'Admin',
                'description' => 'Full administrative access to manage store operations, staff, and roles.',
                'is_system' => true,
                'permissions' => $all,
            ],
            [
                'name' => 'Manager',
                'description' => 'Store operations manager with authority over catalog, inventory, sales, and purchases.',
                'is_system' => true,
                'permissions' => [
                    'dashboard.view',
                    'products.view', 'products.create', 'products.edit',
                    'pos.view', 'pos.create',
                    'sales.view', 'sales.create', 'sales.edit',
                    'purchases.view', 'purchases.create', 'purchases.edit',
                    'customers.view', 'customers.create', 'customers.edit',
                    'suppliers.view', 'suppliers.create', 'suppliers.edit',
                    'reports.view',
                    'staff.view',
                ],
            ],
            [
                'name' => 'Seller',
                'description' => 'Sales staff and cashier terminal operator.',
                'is_system' => true,
                'permissions' => [
                    'dashboard.view',
                    'pos.view', 'pos.create',
                    'sales.view', 'sales.create', 'sales.edit',
                    'products.view',
                    'customers.view', 'customers.create',
                ],
            ],
            [
                'name' => 'Accountant',
                'description' => 'Financial ledger, expenses, accounts, and financial statement manager.',
                'is_system' => true,
                'permissions' => [
                    'dashboard.view',
                    'accounting.view', 'accounting.create', 'accounting.edit', 'accounting.delete',
                    'reports.view',
                    'sales.view',
                ],
            ],
            [
                'name' => 'HR Manager',
                'description' => 'Staff and human resource manager.',
                'is_system' => true,
                'permissions' => [
                    'dashboard.view',
                    'staff.view', 'staff.create', 'staff.edit',
                    'reports.view',
                ],
            ],
            [
                'name' => 'Inventory Manager',
                'description' => 'Warehouse stock, physical inventory count, and receiving inspector.',
                'is_system' => true,
                'permissions' => [
                    'dashboard.view',
                    'products.view', 'products.create', 'products.edit', 'products.delete',
                    'purchases.view', 'purchases.create', 'purchases.edit',
                    'suppliers.view',
                    'reports.view',
                ],
            ],
        ];
    }

    /**
     * Seed or ensure default system roles for a specific store.
     */
    public function seedDefaultRoles(Store $store): void
    {
        $defaultRoles = $this->getDefaultRoleTemplates();

        foreach ($defaultRoles as $roleData) {
            ShopRole::query()->updateOrCreate(
                [
                    'store_id' => $store->id,
                    'name' => $roleData['name'],
                ],
                [
                    'description' => $roleData['description'],
                    'is_system' => $roleData['is_system'],
                    'permissions' => $roleData['permissions'],
                ]
            );
        }
    }
}
