import { Component } from '@angular/core';
import { RoomChat } from '../room/room-chat/room-chat';
import { RoomEvent } from '../room/room-socket';

const start = new Date(2026, 10, 4, 14, 2).getTime();
const minute = 60_000;
const members = ['Ana', 'Juan', 'Sam'];

const events: RoomEvent[] = [
  { type: 'joined', name: 'Ana', members: ['Ana'], at: start },
  { type: 'joined', name: 'Juan', members: ['Ana', 'Juan'], at: start },
  { type: 'joined', name: 'Sam', members, at: start },
  { type: 'message', name: 'Ana', text: 'Did everyone get the link?', at: start + minute },
  { type: 'message', name: 'Ana', text: 'It vanishes once we all leave, so no screenshots of my typos', at: start + minute },
  { type: 'message', name: 'Sam', text: 'Got it, I am in', at: start + 2 * minute },
  { type: 'message', name: 'Juan', text: 'Same here. The glass looks great on my phone', at: start + 2 * minute },
  { type: 'message', name: 'Sam', text: 'Tell me if the edges look better now', at: start + 3 * minute },
  { type: 'message', name: 'Juan', text: 'The header refracts the background really nicely', at: start + 3 * minute },
  { type: 'message', name: 'Ana', text: 'Can the bubbles be glass too?', at: start + 4 * minute },
  { type: 'message', name: 'Sam', text: 'That is the plan', at: start + 4 * minute },
];

@Component({
  imports: [RoomChat],
  selector: 'app-design-room',
  template: `<app-room-chat status="open" [events]="events" [members]="members" me="Sam" [link]="link" />`,
})
export class DesignRoom {
  protected readonly events = events;
  protected readonly members = members;
  protected readonly link = 'https://ephemeral.chat/room/4g6uAftAF4ic8F0W';
}
