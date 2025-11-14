import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', canMatch: [guestGuard], loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  { path: 'register', canMatch: [guestGuard], loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage) },
  { path: 'dashboard', canMatch: [authGuard], loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage) },
  { path: 'products', canMatch: [authGuard], loadComponent: () => import('./pages/products/products.page').then(m => m.ProductsPage) },
  { path: 'purchases', canMatch: [authGuard], loadComponent: () => import('./pages/purchases/purchases.page').then(m => m.PurchasesPage) },
  { path: 'sales', canMatch: [authGuard], loadComponent: () => import('./pages/sales/sales.page').then(m => m.SalesPage) },
  { path: 'stock', canMatch: [authGuard], loadComponent: () => import('./pages/stock/stock.page').then(m => m.StockPage) },
  { path: 'customers', canMatch: [authGuard], loadComponent: () => import('./pages/customers/customers.page').then(m => m.CustomersPage) },
  { path: 'invoices', canMatch: [authGuard], loadComponent: () => import('./pages/invoices/invoices.page').then(m => m.InvoicesPage) },
  { path: 'reports', canMatch: [authGuard], loadComponent: () => import('./pages/reports/reports.page').then(m => m.ReportsPage) },
  { path: 'receivables', canMatch: [authGuard], loadComponent: () => import('./pages/receivables/receivables.page').then(m => m.ReceivablesPage) },
  { path: 'payables', canMatch: [authGuard], loadComponent: () => import('./pages/payables/payables.page').then(m => m.PayablesPage) },
  { path: 'balance-sheet', canMatch: [authGuard], loadComponent: () => import('./pages/balance-sheet/balance-sheet.page').then(m => m.BalanceSheetPage) }
  ,{ path: 'settings', canMatch: [authGuard], loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage) }
  ,{ path: 'guide', loadComponent: () => import('./pages/guide/guide.page').then(m => m.GuidePage) }
];
