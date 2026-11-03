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
    const page = fixture.nativeElement as HTMLElement;
    [...page.querySelectorAll('button')].find((b) => b.textContent?.includes('Create room'))?.click();

    await fixture.whenStable();
    expect(page.textContent).toContain('Creating room…');

    http.expectOne({ method: 'POST', url: '/api/rooms' }).flush({ id: 'abc' });
    expect(navigate).toHaveBeenCalledWith(['/room', 'abc']);
    http.verify();
  });

  it('says so when the room cannot be created', async () => {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    [...page.querySelectorAll('button')].find((b) => b.textContent?.includes('Create room'))?.click();

    http.expectOne('/api/rooms').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain("Couldn't create a room");
    expect(page.textContent).toContain('Create room');
  });
});
