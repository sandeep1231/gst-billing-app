import { Component, inject } from '@angular/core';
import { FooterComponent } from './shared/footer/footer.component';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf, FooterComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  navOpen = false;

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  toggleNav() { this.navOpen = !this.navOpen; }
  closeNav() { this.navOpen = false; }
}
