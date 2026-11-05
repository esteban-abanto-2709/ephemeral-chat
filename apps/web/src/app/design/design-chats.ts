import { Component, computed, input } from '@angular/core';
import {
  LucideArrowLeft,
  LucideCopy,
  LucideHourglass,
  LucideIdCard,
  LucideInfo,
  LucideKeyRound,
  LucideLock,
  LucideLogOut,
  LucidePlus,
  LucideSearch,
  LucideSendHorizontal,
  LucideShieldCheck,
  LucideUsersRound,
  LucideTrash2,
} from '@lucide/angular';
import { Glass } from '../glass/glass';
import { avatarHue } from '../room/avatar-hue';
import { MessageList } from '../room/message-list/message-list';
import { NameDialog } from '../room/name-dialog/name-dialog';
import { RoomEvent } from '../room/room-socket';
import { ThemeToggle } from '../theme/theme-toggle/theme-toggle';

export type ChatsState = 'start' | 'chats' | 'new group' | 'group' | 'private' | 'left';

interface ChatPreview {
  kind: 'group' | 'private';
  name: string;
  last: string;
  time: string;
  unread: number;
}

const start = new Date(2026, 10, 4, 14, 2).getTime();
const minute = 60_000;
const ana = { id: 'ana', name: 'Ana' };
const juan = { id: 'juan', name: 'Juan' };
const sam = { id: 'sam', name: 'Sam' };
const luis = { id: 'luis', name: 'Luis' };

const groupEvents: RoomEvent[] = [
  { type: 'joined', ...ana, members: [ana], at: start },
  { type: 'joined', ...juan, members: [ana, juan], at: start },
  { type: 'joined', ...sam, members: [ana, juan, sam], at: start },
  { type: 'message', ...ana, own: false, text: 'Saturday at 9, the usual place?', at: start + minute },
  { type: 'message', ...ana, own: false, text: 'I can bring the tent', at: start + minute },
  { type: 'message', ...juan, own: false, text: 'Works for me', at: start + 2 * minute },
  { type: 'message', ...sam, own: true, text: 'Got it, I am in', at: start + 3 * minute },
];

const privateEvents: RoomEvent[] = [
  { type: 'message', ...luis, own: false, text: 'Hey, got your id from the group', at: start + minute },
  { type: 'message', ...sam, own: true, text: 'Nice, this one is just us two', at: start + 2 * minute },
  { type: 'message', ...luis, own: false, text: 'And it is gone once we close the tab', at: start + 2 * minute },
];

const chats: ChatPreview[] = [
  { kind: 'group', name: 'Weekend trip', last: 'Sam: Got it, I am in', time: '14:05', unread: 0 },
  { kind: 'private', name: 'Luis', last: 'And it is gone once we close the tab', time: '14:04', unread: 0 },
  { kind: 'private', name: 'Ana', last: 'Is the link working for you?', time: '13:58', unread: 2 },
  { kind: 'group', name: 'Book club', last: 'Eva: Chapter 4 by Friday', time: '12:15', unread: 5 },
];

@Component({
  imports: [
    Glass,
    LucideArrowLeft,
    LucideCopy,
    LucideHourglass,
    LucideIdCard,
    LucideInfo,
    LucideKeyRound,
    LucideLock,
    LucideLogOut,
    LucidePlus,
    LucideSearch,
    LucideSendHorizontal,
    LucideShieldCheck,
    LucideUsersRound,
    LucideTrash2,
    MessageList,
    NameDialog,
    ThemeToggle,
  ],
  selector: 'app-design-chats',
  templateUrl: './design-chats.html',
})
export class DesignChats {
  readonly state = input<ChatsState>('chats');

  protected readonly avatarHue = avatarHue;
  protected readonly me = 'Sam';
  protected readonly myId = 'u7Qm2xKp9RtLw4Zb8NcVhA';
  protected readonly code = 'aB3xQ9mK2pLt7vRw4ZcN8e';
  protected readonly filters = ['All', 'Unread', 'Groups', 'Private'];
  protected readonly left = computed(() => this.state() === 'left');
  protected readonly chats = computed(() => {
    const state = this.state();
    if (state === 'start') {
      return [];
    }
    return this.left() ? chats.map((chat) => (chat.name === 'Luis' ? { ...chat, last: 'Luis left' } : chat)) : chats;
  });
  protected readonly open = computed(() => {
    const state = this.state();
    return state === 'group' ? this.chats()[0] : state === 'private' || state === 'left' ? this.chats()[1] : null;
  });
  protected readonly events = computed(() => {
    const state = this.state();
    if (state === 'group') {
      return groupEvents;
    }
    return this.left()
      ? [...privateEvents, { type: 'left', ...luis, members: [sam], at: start + 5 * minute } as RoomEvent]
      : privateEvents;
  });
}
