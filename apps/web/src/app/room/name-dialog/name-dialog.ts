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
import { Glass } from '../../glass/glass';

export const nameMaxLength = 24;

@Component({
  imports: [FormField, FormRoot, Glass],
  selector: 'app-name-dialog',
  templateUrl: './name-dialog.html',
})
export class NameDialog {
  readonly heading = input("What's your name?");
  readonly label = input('Name');
  readonly placeholder = input('Ana');
  readonly hint = input("It's how others see you. It lasts until you close this tab.");
  readonly action = input('Start chatting');
  readonly cancelable = input(false);
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
    if (this.cancelable()) {
      this.dialog().nativeElement.close();
      this.dismissed.emit();
    }
  }

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }
}
