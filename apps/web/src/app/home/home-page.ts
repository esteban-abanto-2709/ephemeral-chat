import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  LucideHourglass,
  LucideLink,
  LucideLoaderCircle,
  LucideShieldCheck,
  LucideUserX,
} from '@lucide/angular';
import { Glass } from '../glass/glass';
import { ThemeToggle } from '../theme/theme-toggle/theme-toggle';

@Component({
  imports: [
    Glass,
    LucideHourglass,
    LucideLink,
    LucideLoaderCircle,
    LucideShieldCheck,
    LucideUserX,
    ThemeToggle,
  ],
  selector: 'app-home-page',
  templateUrl: './home-page.html',
})
export class HomePage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly state = signal<'idle' | 'creating' | 'failed'>('idle');

  protected createRoom(): void {
    this.state.set('creating');
    this.http.post<{ id: string }>('/api/rooms', null).subscribe({
      next: ({ id }) => this.router.navigate(['/room', id]),
      error: () => this.state.set('failed'),
    });
  }
}
