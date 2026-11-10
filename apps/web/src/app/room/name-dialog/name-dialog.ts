import {
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormField,
  FormRoot,
  form,
  maxLength,
  requiredError,
  validate,
} from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { Glass } from '../../glass/glass';

export const nameMaxLength = 24;

@Component({
  imports: [FormField, FormRoot, Glass, TranslocoPipe],
  selector: 'app-name-dialog',
  templateUrl: './name-dialog.html',
})
export class NameDialog {
  readonly kind = input<'name' | 'group'>('name');
  readonly initial = input('');
  readonly chosen = output<string>();
  readonly dismissed = output();

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

  protected cancel(event: Event): void {
    event.preventDefault();
    this.dialog().nativeElement.close();
    this.dismissed.emit();
  }

  constructor() {
    afterNextRender(() => {
      this.model.set({ name: this.initial() });
      this.dialog().nativeElement.showModal();
    });
  }
}
