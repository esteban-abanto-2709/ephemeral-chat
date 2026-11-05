import { TestBed } from '@angular/core/testing';
import { NameDialog } from './name-dialog';

describe('NameDialog', () => {
  async function render() {
    const fixture = TestBed.createComponent(NameDialog);
    const chosen: string[] = [];
    fixture.componentInstance.chosen.subscribe((name) => chosen.push(name));
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    async function submit(name: string) {
      const input = page.querySelector('#name') as HTMLInputElement;
      input.value = name;
      input.dispatchEvent(new Event('input'));
      page.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();
    }

    return { page, chosen, submit, dialog: page.querySelector('dialog') as HTMLDialogElement };
  }

  it('opens as soon as it appears', async () => {
    const { dialog } = await render();
    expect(dialog.open).toBe(true);
  });

  it('emits the trimmed name and closes', async () => {
    const { chosen, submit, dialog } = await render();
    await submit('  Juan  ');
    expect(chosen).toEqual(['Juan']);
    expect(dialog.open).toBe(false);
  });

  it('rejects a blank name', async () => {
    const { page, chosen, submit, dialog } = await render();
    await submit('   ');
    expect(chosen).toEqual([]);
    expect(dialog.open).toBe(true);
    expect(page.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('rejects a name over 24 characters', async () => {
    const { chosen, submit } = await render();
    await submit('x'.repeat(25));
    expect(chosen).toEqual([]);
    await submit('x'.repeat(24));
    expect(chosen).toEqual(['x'.repeat(24)]);
  });
});
