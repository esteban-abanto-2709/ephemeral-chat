import { Component, ElementRef, afterNextRender, input, output, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, form, maxLength, requiredError, validate } from '@angular/forms/signals';
import { Glass } from '../../glass/glass';

export const nameMaxLength = 24;

@Component({
  imports: [FormField, FormRoot, Glass],
  selector: 'app-name-dialog',
  templateUrl: './name-dialog.html',
})
export class NameDialog {
  readonly taken = input<string | null>(null);
  readonly heading = input("What's your name?");
  readonly label = input('Name');
  readonly placeholder = input('Ana');
  readonly hint = input("It's how others will see you in this room.");
  readonly action = input('Join');
  readonly chosen = output<string>();

  protected readonly maxLength = nameMaxLength;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly model = signal({ name: '' });

  protected readonly nameForm = form(
    this.model,
    (path) => {
      validate(path.name, ({ value }) => (value().trim() ? undefined : requiredError()));
      maxLength(path.name, nameMaxLength);
    },
    {
      submission: {
        action: async () => {
          this.dialog().nativeElement.close();
          this.chosen.emit(this.model().name.trim());
          return undefined;
        },
      },
    },
  );

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }
}
