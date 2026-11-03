import { Component, signal } from '@angular/core';
import {
  LucideCopy,
  LucideHourglass,
  LucideSendHorizontal,
  LucideShieldCheck,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { Glass } from '../glass/glass';
import { ThemeToggle } from '../theme/theme-toggle/theme-toggle';

type DemoEvent =
  | { type: 'message'; name: string; text: string; time: string; own?: boolean; first?: boolean }
  | { type: 'notice'; text: string };

const colors: Record<string, string> = { Alex: '#12a97f', Ana: '#6a4fe6', Luis: '#e0466c' };

@Component({
  imports: [
    Glass,
    LucideCopy,
    LucideHourglass,
    LucideSendHorizontal,
    LucideShieldCheck,
    LucideUsers,
    LucideX,
    ThemeToggle,
  ],
  selector: 'app-demo-page',
  templateUrl: './demo-page.html',
})
export class DemoPage {
  protected readonly colors = colors;
  protected readonly members = ['Alex', 'Ana', 'Luis'];
  protected readonly panelOpen = signal(false);
  protected readonly events: DemoEvent[] = [
    { type: 'notice', text: 'Ana joined' },
    { type: 'message', name: 'Ana', text: 'Hola! Ya entré, ¿Luis viene?', time: '21:04', first: true },
    { type: 'message', name: 'Alex', text: 'Le pasé el link, ya debe estar por entrar', time: '21:04', own: true, first: true },
    { type: 'notice', text: 'Luis joined' },
    { type: 'message', name: 'Luis', text: 'Aquí estoy', time: '21:05', first: true },
    { type: 'message', name: 'Luis', text: '¿De qué hablamos? Esto se borra cuando nos vayamos, ¿no?', time: '21:05' },
    { type: 'message', name: 'Alex', text: 'Exacto, nada se guarda. Cuando salgamos todos, la sala desaparece.', time: '21:06', own: true, first: true },
    { type: 'message', name: 'Ana', text: 'Me encanta', time: '21:06', first: true },
  ];
}
