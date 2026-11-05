import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RoomPanel } from './room-panel';

describe('RoomPanel', () => {
  async function render() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(RoomPanel);
    fixture.componentRef.setInput('members', [
      { id: 'j', name: 'Juan' },
      { id: 'l', name: 'Luis' },
    ]);
    fixture.componentRef.setInput('me', 'j');
    await fixture.whenStable();
    return { fixture, panel: fixture.nativeElement as HTMLElement };
  }

  it('shows who is in the room and marks you', async () => {
    const { panel } = await render();

    expect(panel.querySelector('#members-title')?.textContent).toContain('In this room · 2');
    const members = [...panel.querySelectorAll('[aria-label="People in the room"] li')].map((li) =>
      [...li.children].map((part) => part.textContent?.trim()).join(' '),
    );
    expect(members).toEqual(['J Juan you', 'L Luis']);
  });
});
