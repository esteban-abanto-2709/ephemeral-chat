import { Component, computed, input } from '@angular/core';
import { Attachment } from '../chats/attachment';
import { Chat, ChatEvent, ChatMessage, Person } from '../chats/chat-client';
import { ChatList } from '../chats/chat-list/chat-list';
import { ChatsWelcome } from '../chats/chats-welcome';
import { Glass } from '../glass/glass';
import { NameDialog } from '../room/name-dialog/name-dialog';
import { PhotoViewer } from '../room/photo-viewer/photo-viewer';
import { RoomChat } from '../room/room-chat/room-chat';

export const chatsStates = ['start', 'chats', 'group', 'media', 'photos', 'left'] as const;
export type ChatsState = (typeof chatsStates)[number];
export const photoViews = ['chat', 'send', 'tall', 'viewer'] as const;
export type PhotoView = (typeof photoViews)[number];

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
  {
    type: 'message',
    ...ana,
    own: false,
    text: 'Saturday at 9, the usual place?',
    at: start + minute,
  },
  { type: 'message', ...ana, own: false, text: 'I can bring the tent', at: start + minute },
  {
    type: 'message',
    ...juan,
    own: false,
    text: 'Works for me',
    reply: { ...ana, own: false, text: 'Saturday at 9, the usual place?' },
    at: start + 2 * minute,
  },
  {
    type: 'message',
    ...sam,
    own: true,
    text: 'Got it, I am in: https://maps.example.com/trail',
    at: start + 3 * minute,
  },
];

const photo = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='1200' viewBox='0 0 400 300'><defs><linearGradient id='s' x2='0' y2='1'><stop offset='0' stop-color='#f4a261'/><stop offset='1' stop-color='#fde8c8'/></linearGradient></defs><rect width='400' height='300' fill='url(#s)'/><circle cx='300' cy='95' r='34' fill='#fff4d6'/><path d='M0 230 90 140l80 70 80-90 150 130v50H0z' fill='#6d8b74'/><path d='M0 260l120-60 100 55 100-45 80 50v40H0z' fill='#3f5e4b'/><path d='M150 262l30-42 30 42z' fill='#e76f51'/></svg>",
)}`;

const portrait = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='900' height='1600' viewBox='0 0 225 400'><defs><linearGradient id='n' x2='0' y2='1'><stop offset='0' stop-color='#1d3557'/><stop offset='.6' stop-color='#e76f51'/><stop offset='1' stop-color='#f4a261'/></linearGradient></defs><rect width='225' height='400' fill='url(#n)'/><circle cx='150' cy='90' r='3' fill='#fff'/><circle cx='60' cy='60' r='2' fill='#fff'/><circle cx='112' cy='245' r='30' fill='#ffd6a5'/><path d='M0 270 70 210l50 45 50-60 55 50v155H0z' fill='#3f5e4b'/><path d='M0 330l80-40 60 30 85-45v125H0z' fill='#1b2f25'/><rect x='104' y='300' width='16' height='60' fill='#e9c46a'/><path d='M92 300h40l-20-28z' fill='#e76f51'/></svg>",
)}`;

const sticker = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><g stroke='#fff' stroke-width='12' stroke-linejoin='round'><path d='M50 70h90v60a45 45 0 0 1-90 0z' fill='#8ecae6'/><path d='M140 85h12a20 20 0 0 1 0 40h-14' fill='none'/></g><path d='M50 70h90v60a45 45 0 0 1-90 0z' fill='#8ecae6'/><path d='M140 85h12a20 20 0 0 1 0 40h-14' fill='none' stroke='#8ecae6' stroke-width='10'/><path d='M75 35c-8 10 8 15 0 25M100 30c-8 10 8 15 0 25M125 35c-8 10 8 15 0 25' fill='none' stroke='#219ebc' stroke-width='6' stroke-linecap='round'/></svg>",
)}`;

const campsite: Attachment = { kind: 'image', name: 'campsite.jpg', size: 2_400_000, url: photo };
const lake: Attachment = { ...campsite, name: 'lake.jpg', url: `${photo}#lake` };
const ridge: Attachment = { kind: 'image', name: 'ridge.jpg', size: 1_900_000, url: portrait };
const routeMap: Attachment = {
  kind: 'file',
  name: 'route-map.pdf',
  size: 3_100_000,
  url: 'data:,',
};
const juanVoice: Attachment = {
  kind: 'voice',
  name: 'voice.webm',
  size: 48_000,
  url: '',
  seconds: 12,
};

function media(person: Person, own: boolean, at: number, file: Attachment): ChatEvent {
  return { type: 'message', ...person, own, text: '', file, at: start + at * minute };
}

const ridgePhoto = {
  ...media(ana, false, 6, ridge),
  text: 'Sunrise from the ridge, last year',
} as ChatMessage;

const photoEvents: ChatEvent[] = [
  ...tripEvents,
  media(ana, false, 4, campsite),
  {
    type: 'message',
    ...juan,
    own: false,
    text: 'That view, wow',
    reply: { ...ana, own: false, text: '', file: campsite },
    at: start + 4 * minute,
  },
  { ...media(sam, true, 5, lake), text: 'Our spot for Saturday' } as ChatEvent,
  ridgePhoto,
  media(sam, true, 7, ridge),
];

const mediaEvents: ChatEvent[] = [
  ...tripEvents,
  media(juan, false, 6, routeMap),
  media(sam, true, 6, { kind: 'file', name: 'packing-list.pdf', size: 184_000, url: 'data:,' }),
  media(juan, false, 7, juanVoice),
  {
    ...media(sam, true, 8, { ...juanVoice, seconds: 31 }),
    reply: { ...juan, own: false, text: '', file: juanVoice },
  } as ChatEvent,
  media(ana, false, 9, { kind: 'sticker', name: 'coffee.webp', size: 21_000, url: sticker }),
  media(sam, true, 9, { kind: 'sticker', name: 'coffee.webp', size: 21_000, url: sticker }),
];

const luisEvents: ChatEvent[] = [
  {
    type: 'message',
    ...luis,
    own: false,
    text: 'Hey, got your ID from the group',
    at: start + minute,
  },
  {
    type: 'message',
    ...sam,
    own: true,
    text: 'Nice, this one is just us two',
    at: start + 2 * minute,
  },
  {
    type: 'message',
    ...luis,
    own: false,
    text: 'And it is gone once we close the tab',
    at: start + 2 * minute,
  },
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
    events: [
      {
        type: 'message',
        ...eva,
        own: false,
        text: 'Chapter 4 by Friday',
        at: start - 110 * minute,
      },
    ],
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
    events: [
      {
        type: 'message',
        ...ana,
        own: false,
        text: 'Is the link working for you?',
        at: start - 4 * minute,
      },
    ],
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
    events: [
      { type: 'message', ...sam, own: true, text: 'See you at 6', at: start - 300 * minute },
    ],
    members: [juan, sam],
    typing: [],
    unread: 0,
    at: start,
  },
];

@Component({
  imports: [ChatList, ChatsWelcome, Glass, NameDialog, PhotoViewer, RoomChat],
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
          [recording]="state() === 'media' ? 12 : null"
          [replying]="state() === 'group' ? replying : null"
          [preview]="preview()"
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
        <app-chats-welcome
          class="hidden"
          [class.md:flex]="state() === 'chats'"
          me="u7Qm2xKp9RtLw4Zb8NcVhA"
        />
      }
      @if (state() === 'photos' && view() === 'viewer') {
        <app-photo-viewer [message]="ridgePhoto" />
      }
      @if (state() === 'start') {
        <app-name-dialog
          hint="It's how others see you in every chat. It lasts until you close this tab."
        />
      }
    </div>
  `,
})
export class DesignChats {
  protected readonly ridgePhoto = ridgePhoto;
  protected readonly replying = { ...ana, own: false, text: 'I can bring the tent' };
  readonly state = input<ChatsState>('chats');
  readonly view = input<PhotoView>('chat');

  protected readonly preview = computed((): Attachment[] => {
    if (this.state() !== 'photos') {
      return [];
    }
    switch (this.view()) {
      case 'send':
        return [campsite, lake, routeMap];
      case 'tall':
        return [ridge, campsite];
      default:
        return [];
    }
  });

  protected readonly chats = computed(() => {
    const state = this.state();
    if (state === 'start') {
      return [];
    }
    const events = state === 'media' ? mediaEvents : state === 'photos' ? photoEvents : null;
    const trip = events ? { ...chats[0], events, typing: [] } : chats[0];
    return [trip, state === 'left' ? luisLeft : luisChat, ...chats.slice(1)];
  });
  protected readonly open = computed(() => {
    const state = this.state();
    if (state === 'group' || state === 'media' || state === 'photos') {
      return this.chats()[0];
    }
    return state === 'left' ? luisLeft : null;
  });
}
