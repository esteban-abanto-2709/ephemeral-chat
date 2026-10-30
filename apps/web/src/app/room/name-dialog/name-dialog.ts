import { Component, ElementRef, afterNextRender, output, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, form, maxLength, requiredError, validate } from '@angular/forms/signals';

export const nameMaxLength = 24;

@Component({
  imports: [FormField, FormRoot],
  selector: 'app-name-dialog',
  templateUrl: './name-dialog.html',
})
export class NameDialog {
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
