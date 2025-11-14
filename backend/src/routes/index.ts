import auth from './auth.routes';
import customers from './customers.routes';
import products from './products.routes';
import invoices from './invoices.routes';
import reports from './reports.routes';
import purchases from './purchases.routes';
import company from './company.routes';

export default function registerRoutes(app: any) {
  app.use('/auth', auth);
  app.use('/customers', customers);
  app.use('/products', products);
  app.use('/invoices', invoices);
  app.use('/reports', reports);
  app.use('/purchases', purchases);
  app.use('/company', company);
}
