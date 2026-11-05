import { Component, computed, input } from '@angular/core';
import { Chat, ChatEvent } from '../chats/chat-client';
import { ChatList } from '../chats/chat-list/chat-list';
import { ChatsWelcome } from '../chats/chats-welcome';
import { Glass } from '../glass/glass';
import { NameDialog } from '../room/name-dialog/name-dialog';
import { RoomChat } from '../room/room-chat/room-chat';

export const chatsStates = ['start', 'chats', 'new group', 'group', 'private', 'left'] as const;
export type ChatsState = (typeof chatsStates)[number];

const start = new Date(2026, 10, 4, 14, 2).getTime();
const minute = 60_000;
const ana = { id: 'ana', name: 'Ana' };
const juan = { id: 'juan', name: 'Juan' };
const sam = { id: 'sam', name: 'Sam' };
const eva = { id: 'eva', name: 'Eva' };
const luis = { id: 'luis', name: 'Luis' };

const tripEvents: ChatEvent[] = [
  { type: 'joined', ...ana, members: [ana], at: start },
  { type: 'joined', ...juan, members: [ana, juan], at: start },
  { type: 'joined', ...sam, members: [ana, juan, sam], at: start },
  { type: 'message', ...ana, own: false, text: 'Saturday at 9, the usual place?', at: start + minute },
  { type: 'message', ...ana, own: false, text: 'I can bring the tent', at: start + minute },
  { type: 'message', ...juan, own: false, text: 'Works for me', at: start + 2 * minute },
  { type: 'message', ...sam, own: true, text: 'Got it, I am in', at: start + 3 * minute },
];

const luisEvents: ChatEvent[] = [
  { type: 'message', ...luis, own: false, text: 'Hey, got your ID from the group', at: start + minute },
  { type: 'message', ...sam, own: true, text: 'Nice, this one is just us two', at: start + 2 * minute },
  { type: 'message', ...luis, own: false, text: 'And it is gone once we close the tab', at: start + 2 * minute },
];

const luisChat: Chat = {
  id: 'luis',
  kind: 'private',
  ended: false,
  title: 'Luis',
  events: luisEvents,
  members: [sam, luis],
  typing: [],
  unread: 0,
  at: start,
};

const luisLeft: Chat = {
  ...luisChat,
  ended: true,
  events: [...luisEvents, { type: 'left', ...luis, members: [sam], at: start + 5 * minute }],
};

const chats: Chat[] = [
  {
    id: 'aB3xQ9mK2pLt7vRw4ZcN8e',
    kind: 'group',
    ended: false,
    title: 'Weekend trip',
    events: tripEvents,
    members: [ana, juan, sam],
    typing: [ana],
    unread: 0,
    at: start,
  },
  {
    id: 'Zt4pQ8mW2xLk7vRn3YcB6d',
    kind: 'group',
    ended: false,
    title: 'Book club',
    events: [{ type: 'message', ...eva, own: false, text: 'Chapter 4 by Friday', at: start - 110 * minute }],
    members: [eva, sam],
    typing: [],
    unread: 5,
    at: start,
  },
  {
    id: 'ana',
    kind: 'private',
    ended: false,
    title: 'Ana',
    events: [{ type: 'message', ...ana, own: false, text: 'Is the link working for you?', at: start - 4 * minute }],
    members: [sam, ana],
    typing: [],
    unread: 2,
    at: start,
  },
  {
    id: 'Qm7rT2kX9pLs4vWn8ZbC3f',
    kind: 'group',
    ended: false,
    title: 'Study group',
    events: [{ type: 'message', ...sam, own: true, text: 'See you at 6', at: start - 300 * minute }],
    members: [juan, sam],
    typing: [],
    unread: 0,
    at: start,
  },
];

@Component({
  imports: [ChatList, ChatsWelcome, Glass, NameDialog, RoomChat],
  selector: 'app-design-chats',
  template: `
    <div class="relative flex h-dvh md:gap-4 md:p-4">
      <app-chat-list
        appGlass
        class="m-2 min-w-0 flex-1 flex-col gap-4 rounded-3xl p-4 md:m-0 md:flex md:w-96 md:flex-none"
        [class.flex]="!open()"
        [class.hidden]="open()"
        [chats]="chats()"
        [active]="open()?.id ?? null"
        me="u7Qm2xKp9RtLw4Zb8NcVhA"
        [name]="state() === 'start' ? null : 'Sam'"
      />
      @if (open(); as chat) {
        <app-room-chat
          status="open"
          [title]="chat.title"
          [kind]="chat.kind"
          [ended]="chat.ended"
          [events]="chat.events"
          [members]="chat.members"
          me="sam"
          [code]="chat.id"
          [link]="'https://ephemeral.chat/room/' + chat.id"
          [typing]="chat.typing"
        />
      } @else {
        <app-chats-welcome class="hidden" [class.md:flex]="state() === 'chats'" me="u7Qm2xKp9RtLw4Zb8NcVhA" />
      }
      @if (state() === 'start') {
        <app-name-dialog hint="It's how others see you in every chat. It lasts until you close this tab." />
      }
      @if (state() === 'new group') {
        <app-name-dialog
          heading="New group"
          label="Group name"
          placeholder="Weekend trip"
          hint="It can't be changed later, and the group vanishes once everyone leaves."
          action="Create group"
          [cancelable]="true"
        />
      }
    </div>
  `,
})
export class DesignChats {
  readonly state = input<ChatsState>('chats');

  protected readonly chats = computed(() => {
    const state = this.state();
    if (state === 'start') {
      return [];
    }
    return [chats[0], state === 'left' ? luisLeft : luisChat, ...chats.slice(1)];
  });
  protected readonly open = computed(() => {
    const state = this.state();
    return state === 'group' ? chats[0] : state === 'private' ? luisChat : state === 'left' ? luisLeft : null;
  });
}
