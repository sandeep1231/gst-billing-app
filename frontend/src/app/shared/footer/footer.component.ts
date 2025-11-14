import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="app-footer text-center text-muted py-3 mt-auto">
      <div class="container">
        <small>&copy; {{year}} GST Billing App</small>
      </div>
    </footer>
  `,
  styles: [`
    .app-footer { font-size: 0.75rem; border-top: 1px solid #e5e5e5; background:#f8f9fa; }
  `]
})
export class FooterComponent { year = new Date().getFullYear(); }
