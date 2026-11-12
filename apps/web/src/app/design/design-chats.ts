import { Component, computed, input } from '@angular/core';
import { Attachment } from '../chats/attachment';
import { Chat, ChatEvent, ChatMessage, Person } from '../chats/chat-client';
import { ChatList } from '../chats/chat-list/chat-list';
import { ChatsWelcome } from '../chats/chats-welcome';
import { Glass } from '../glass/glass';
import { Language } from '../i18n/i18n';
import { NameDialog } from '../room/name-dialog/name-dialog';
import { PhotoViewer } from '../room/photo-viewer/photo-viewer';
import { QrDialog } from '../room/qr-dialog/qr-dialog';
import { RoomChat } from '../room/room-chat/room-chat';

export const chatsStates = ['start', 'chats', 'group', 'media', 'photos', 'qr', 'left'] as const;
export type ChatsState = (typeof chatsStates)[number];
export const photoViews = ['chat', 'send', 'tall', 'viewer'] as const;
export type PhotoView = (typeof photoViews)[number];
export const qrViews = ['invite', 'group'] as const;
export type QrView = (typeof qrViews)[number];
export type DesignView = PhotoView | QrView;

const start = new Date(2026, 10, 4, 14, 2).getTime();
const minute = 60_000;

type Text = Record<Language, string>;

const words = {
  crew: { en: 'Friday crew', es: 'Los del viernes' },
  surprise: { en: 'Surprise for Dani', es: 'Sorpresa para Dani' },
  build: { en: 'Who broke the build', es: 'Quién rompió el build' },
  me: { en: 'Lonely Skull', es: 'Cráneo Solitario' },
  fox: { en: 'Midnight Fox', es: 'Zorro Nocturno' },
  wolf: { en: 'Silver Wolf', es: 'Lobo Plateado' },
  owl: { en: 'Golden Owl', es: 'Búho Dorado' },
  jester: { en: 'Masked Jester', es: 'Bufón Enmascarado' },
  raven: { en: 'Crimson Raven', es: 'Cuervo Carmesí' },
  titan: { en: 'Iron Titan', es: 'Titán Implacable' },
  ghost: { en: 'Hollow Ghost', es: 'Fantasma Olvidado' },
  areWeAllHere: { en: 'are we all here?', es: '¿estamos todos?' },
  allFive: {
    en: 'all five. no idea who any of you are though',
    es: 'los cinco. igual no sé quién es quién',
  },
  keepItThatWay: { en: 'good, keep it that way', es: 'mejor, que siga así' },
  birthday: {
    en: "ok. I took this at Dani's birthday and everyone needs to see it",
    es: 'ya. tomé esto en el cumple de Dani y lo tiene que ver todo el mundo',
  },
  no: { en: 'NO', es: 'NO' },
  whoIsThat: { en: 'who is that in the pink hat', es: '¿quién es el del gorro rosado?' },
  notMe: { en: 'not me. I left early', es: 'yo no. me fui temprano' },
  sureYouDid: { en: 'sure you did', es: 'sí, claro' },
  closeUp: { en: "close-up. you're welcome", es: 'de cerca. de nada' },
  deleteThat: { en: 'delete that', es: 'borra eso' },
  playlist: {
    en: 'playlist from that night: https://music.example.com/dani',
    es: 'la playlist de esa noche: https://music.example.com/dani',
  },
  pinkHat: {
    en: 'ok that was you in the pink hat, right?',
    es: 'ya, el del gorro rosado eras tú, ¿no?',
  },
  cantProve: { en: "you can't prove it", es: 'no puedes probarlo' },
  haveOriginal: { en: 'I have the original', es: 'tengo la original' },
  silence: { en: 'how much for your silence', es: '¿cuánto por tu silencio?' },
  nobodyTell: { en: 'nobody tell Dani', es: 'que nadie le diga a Dani' },
  linkWorking: { en: 'is the link working for you?', es: '¿te funciona el link?' },
  alreadyBroken: { en: 'it was already broken', es: 'ya estaba roto' },
} satisfies Record<string, Text>;

function media(person: Person, own: boolean, at: number, file: Attachment): ChatEvent {
  return { type: 'message', ...person, own, text: '', file, at: start + at * minute };
}

function buildChats(lang: Language) {
  const t = (text: Text) => text[lang];
  const person = (id: string, name: Text): Person => ({ id, name: t(name) });
  const me = person('lonely-skull', words.me);
  const fox = person('midnight-fox', words.fox);
  const wolf = person('silver-wolf', words.wolf);
  const owl = person('golden-owl', words.owl);
  const jester = person('masked-jester', words.jester);
  const raven = person('crimson-raven', words.raven);
  const titan = person('iron-titan', words.titan);
  const ghost = person('hollow-ghost', words.ghost);

  const wide: Attachment = {
    kind: 'image',
    name: 'IMG_2041.jpg',
    size: 2_400_000,
    url: '/samples/party.webp',
  };
  const tall: Attachment = {
    kind: 'image',
    name: 'IMG_2043.jpg',
    size: 1_900_000,
    url: '/samples/party-tall.webp',
  };
  const guestList: Attachment = {
    kind: 'file',
    name: 'guest-list.pdf',
    size: 2_100_000,
    url: 'data:,',
  };
  const voice: Attachment = {
    kind: 'voice',
    name: 'voice.webm',
    size: 48_000,
    url: '',
    seconds: 12,
  };

  const say = (who: Person, own: boolean, text: Text, at: number): ChatMessage => ({
    type: 'message',
    ...who,
    own,
    text: t(text),
    at: start + at * minute,
  });

  const crewMembers = [fox, wolf, owl, me, jester];
  const crewEvents: ChatEvent[] = [
    { type: 'joined', ...jester, members: crewMembers, at: start },
    say(fox, false, words.areWeAllHere, 1),
    say(wolf, false, words.allFive, 1),
    say(owl, false, words.keepItThatWay, 2),
    say(fox, false, words.birthday, 3),
    media(fox, false, 3, wide),
    say(wolf, false, words.no, 4),
    {
      ...say(owl, false, words.whoIsThat, 4),
      reply: { ...fox, own: false, text: '', file: wide },
    },
    say(me, true, words.notMe, 5),
    say(fox, false, words.sureYouDid, 6),
  ];

  const closeUp = { ...media(wolf, false, 7, tall), text: t(words.closeUp) } as ChatMessage;
  const photoEvents: ChatEvent[] = [
    ...crewEvents,
    closeUp,
    {
      ...say(me, true, words.deleteThat, 8),
      reply: { ...wolf, own: false, text: t(words.closeUp), file: tall },
    },
  ];

  const mediaEvents: ChatEvent[] = [
    ...crewEvents,
    say(me, true, words.playlist, 7),
    media(fox, false, 7, guestList),
    media(me, true, 8, { kind: 'file', name: 'who-owes-what.xlsx', size: 184_000, url: 'data:,' }),
    media(wolf, false, 8, voice),
    {
      ...media(me, true, 9, { ...voice, seconds: 31 }),
      reply: { ...wolf, own: false, text: '', file: voice },
    } as ChatEvent,
  ];

  const ravenEvents: ChatEvent[] = [
    { ...say(raven, false, words.pinkHat, 1), seq: 1 },
    { ...say(me, true, words.cantProve, 2), seq: 2 },
    { ...say(raven, false, words.haveOriginal, 2), seq: 3 },
    { ...say(me, true, words.silence, 3), seq: 4 },
    { ...media(me, true, 4, { ...voice, seconds: 8 }), seq: 5 } as ChatEvent,
  ];
  const ravenChat: Chat = {
    id: raven.id,
    kind: 'private',
    ended: false,
    title: raven.name,
    events: ravenEvents,
    members: [me, raven],
    typing: [],
    unread: 0,
    read: 4,
    at: start,
  };
  const ravenLeft: Chat = {
    ...ravenChat,
    ended: true,
    events: [...ravenEvents, { type: 'left', ...raven, members: [me], at: start + 5 * minute }],
  };

  const crew: Chat = {
    id: 'aB3xQ9mK2pLt7vRw4ZcN8e',
    kind: 'group',
    ended: false,
    title: t(words.crew),
    events: crewEvents,
    members: crewMembers,
    typing: [wolf],
    unread: 0,
    read: 0,
    at: start,
  };
  const rest: Chat[] = [
    {
      id: 'Zt4pQ8mW2xLk7vRn3YcB6d',
      kind: 'group',
      ended: false,
      title: t(words.surprise),
      events: [say(titan, false, words.nobodyTell, -110)],
      members: [titan, me],
      typing: [],
      unread: 5,
      read: 0,
      at: start,
    },
    {
      id: ghost.id,
      kind: 'private',
      ended: false,
      title: ghost.name,
      events: [say(ghost, false, words.linkWorking, -4)],
      members: [me, ghost],
      typing: [],
      unread: 2,
      read: 0,
      at: start,
    },
    {
      id: 'Qm7rT2kX9pLs4vWn8ZbC3f',
      kind: 'group',
      ended: false,
      title: t(words.build),
      events: [say(me, true, words.alreadyBroken, -300)],
      members: [fox, me],
      typing: [],
      unread: 0,
      read: 0,
      at: start,
    },
  ];

  return {
    me,
    crew,
    rest,
    ravenChat,
    ravenLeft,
    photoEvents,
    mediaEvents,
    closeUp,
    wide,
    tall,
    guestList,
    replying: { ...owl, own: false, text: t(words.whoIsThat) },
  };
}

@Component({
  imports: [ChatList, ChatsWelcome, Glass, NameDialog, PhotoViewer, QrDialog, RoomChat],
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
        [name]="state() === 'start' ? null : data().me.name"
      />
      @if (open(); as chat) {
        <app-room-chat
          [recording]="state() === 'media' ? 12 : null"
          [replying]="state() === 'group' ? data().replying : null"
          [preview]="preview()"
          status="open"
          [title]="chat.title"
          [kind]="chat.kind"
          [ended]="chat.ended"
          [events]="chat.events"
          [members]="chat.members"
          [me]="data().me.id"
          [code]="chat.id"
          [link]="'https://ephemeral.chat/room/' + chat.id"
          [typing]="chat.typing"
          [read]="chat.read"
        />
      } @else {
        <app-chats-welcome
          class="hidden"
          [class.md:flex]="state() === 'chats' || state() === 'qr'"
          me="u7Qm2xKp9RtLw4Zb8NcVhA"
        />
      }
      @if (state() === 'photos' && view() === 'viewer') {
        <app-photo-viewer [message]="data().closeUp" />
      }
      @if (state() === 'qr') {
        @if (view() === 'group') {
          <app-qr-dialog
            kind="group"
            [title]="data().crew.title"
            url="https://ephemeral.chat/room/aB3xQ9mK2pLt7vRw4ZcN8e"
          />
        } @else {
          <app-qr-dialog kind="private" url="https://ephemeral.chat/chat/u7Qm2xKp9RtLw4Zb8NcVhA" />
        }
      }
      @if (state() === 'start') {
        <app-name-dialog />
      }
    </div>
  `,
})
export class DesignChats {
  readonly state = input<ChatsState>('chats');
  readonly view = input<DesignView>('chat');
  readonly lang = input<Language>('en');

  protected readonly data = computed(() => buildChats(this.lang()));

  protected readonly preview = computed((): Attachment[] => {
    if (this.state() !== 'photos') {
      return [];
    }
    const { wide, tall, guestList } = this.data();
    switch (this.view()) {
      case 'send':
        return [wide, tall, guestList];
      case 'tall':
        return [tall, wide];
      default:
        return [];
    }
  });

  protected readonly chats = computed(() => {
    const state = this.state();
    if (state === 'start') {
      return [];
    }
    const { crew, rest, ravenChat, ravenLeft, photoEvents, mediaEvents } = this.data();
    const events = state === 'media' ? mediaEvents : state === 'photos' ? photoEvents : null;
    const group = events ? { ...crew, events, typing: [] } : crew;
    return [group, state === 'left' ? ravenLeft : ravenChat, ...rest];
  });
  protected readonly open = computed(() => {
    const state = this.state();
    if (
      state === 'group' ||
      state === 'media' ||
      state === 'photos' ||
      (state === 'qr' && this.view() === 'group')
    ) {
      return this.chats()[0];
    }
    return state === 'left' ? this.data().ravenLeft : null;
  });
}
