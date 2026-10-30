import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { HomePage } from './home-page';

describe('HomePage', () => {
  it('creates a room and goes to it', async () => {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();

    http.expectOne({ method: 'POST', url: '/api/rooms' }).flush({ id: 'abc' });
    expect(navigate).toHaveBeenCalledWith(['/room', 'abc']);
    http.verify();
  });
});
