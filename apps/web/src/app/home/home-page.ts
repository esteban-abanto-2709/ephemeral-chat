import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.html',
})
export class HomePage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected createRoom(): void {
    this.http
      .post<{ id: string }>('/api/rooms', null)
      .subscribe(({ id }) => this.router.navigate(['/room', id]));
  }
}
