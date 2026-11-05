import { Component } from '@angular/core';
import { RoomChat } from '../room/room-chat/room-chat';
import { RoomEvent } from '../room/room-socket';

const start = new Date(2026, 10, 4, 14, 2).getTime();
const minute = 60_000;
const ana = { id: 'ana', name: 'Ana' };
const juan = { id: 'juan', name: 'Juan' };
const sam = { id: 'sam', name: 'Sam' };
const members = [ana, juan, sam];

const events: RoomEvent[] = [
  { type: 'joined', ...ana, members: [ana], at: start },
  { type: 'joined', ...juan, members: [ana, juan], at: start },
  { type: 'joined', ...sam, members, at: start },
  { type: 'message', ...ana, own: false, text: 'Did everyone get the link?', at: start + minute },
  { type: 'message', ...ana, own: false, text: 'It vanishes once we all leave, so no screenshots of my typos', at: start + minute },
  { type: 'message', ...sam, own: true, text: 'Got it, I am in', at: start + 2 * minute },
  { type: 'message', ...juan, own: false, text: 'Same here. The glass looks great on my phone', at: start + 2 * minute },
  { type: 'message', ...sam, own: true, text: 'Tell me if the edges look better now', at: start + 3 * minute },
  { type: 'message', ...juan, own: false, text: 'The header refracts the background really nicely', at: start + 3 * minute },
  { type: 'message', ...ana, own: false, text: 'Can the bubbles be glass too?', at: start + 4 * minute },
  { type: 'message', ...sam, own: true, text: 'That is the plan', at: start + 4 * minute },
];

@Component({
  imports: [RoomChat],
  selector: 'app-design-room',
  template: `<app-room-chat status="open" [events]="events" [members]="members" me="sam" [link]="link" [typing]="typing" />`,
})
export class DesignRoom {
  protected readonly events = events;
  protected readonly members = members;
  protected readonly typing = ['Ana'];
  protected readonly link = 'https://ephemeral.chat/room/4g6uAftAF4ic8F0W';
}
