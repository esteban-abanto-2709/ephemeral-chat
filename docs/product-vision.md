# Product vision

## The idea

**You come in with a generated name, open groups or private chats, share a
link, and whoever has it comes in to talk. When everyone leaves, nothing is
left.**

## Principles

They hold in every version. Judge every change against them.

1. **No accounts, no database.** You come in with a generated nickname and
   talk. Your tab gets an id that lives while it is open, never stored.
2. **Truly ephemeral.** The server **never stores messages**: it only relays
   them to whoever is connected at that moment. Someone who joins late sees
   nothing from before. Reloading the page drops everything you had.
3. **The link is the key.** Anyone with a group's link or code gets in, even
   if it was forwarded by someone else. Anyone with your id or invite link can
   write to you; you only hear from them with their first message.
4. **Private by nature.** No public spaces: every conversation happens in a
   group only its link opens, or in a private chat between two people.

## User journey (v0.4)

1. You open the site: the tab enters with a generated **nickname** in its
   language (a noun and an adjective, like "Cráneo Solitario" or "Silver Wolf"),
   which you can change anytime from your card at the bottom of the list, and
   every chat you are in sees it as a label. The tab gets an id that lasts
   until you close it.
2. You see the **chat list**, like WhatsApp Web: New group, Invite with link,
   Copy my ID, and a field to join with a code, link or ID.
3. **A group**: you name it (it can't change), share its link or code, and
   friends join. Everyone sees **"Juan joined"**, who is in, and later
   **"Juan left"**.
4. **A private chat**: someone opens your invite link or pastes your id. You
   hear nothing until their first message, which lands the chat in your list.
5. You exchange **text messages** in real time, in several chats at once,
   with unread counts and who is typing.
6. When the other person leaves a private chat, it turns read-only and you can
   delete it. When everyone leaves a group, after a **one-minute grace
   period** it is gone and its link stops working.

## Limits

The link can reach anyone, so the server protects itself from day one:

| Limit | Value |
|---|---|
| Message length | 1000 characters |
| Messages per person | 5 per second |
| File size | 5 MB |
| Files per person | 3 at once, then one every 2 seconds |
| Voice message | 60 seconds, 1 MB |
| Name length | 24 characters |
| People per group | 50 |
| Chats per tab | 20 |
| Tabs connected at once | 2000 |
| Groups at once | 5000 |
| Grace period for an empty group | 1 minute |

They are tuning values, not product rules: each one lives in one place in the
API and can change as the product gets polished.

## Versions

Each version is a milestone. When all its work is done, it gets a git tag
(`v0.1.0`) and a GitHub release built from the changelog.

| Version | Theme | Work |
|---|---|---|
| v0.1 | The core | The whole user journey above, deployed |
| v0.2 | Glass | Visual redesign: WhatsApp Web layout, liquid glass, light and dark themes |
| v0.3 | Comfort | Clearer room design, mobile keyboard handling, typing indicator |
| v0.4 | Chats | One page with several chats: named groups, private chats by id or invite link |
| v0.5 | Media | Photos and files, replies, voice messages |
| v0.6 | Sharing | Clickable links, QR codes, English and Spanish |
| v0.7 | Names | Generated nicknames you can change, files in binary frames |
| v0.8 | Seen | Read receipts in private chats, a new logo |
| Next | Privacy | End-to-end encryption |

Versions after v0.8 are ideas in the [wishlist](./logbook/wishlist.md) until
they are committed.

**Deploy early.** The app is on Render from the first steps, not at the end,
so "no commit breaks production" means something from day one.

## What it is NOT

Decided against, with the reason, so they are not reopened by accident:

- **No global chat.** A public, anonymous room on an open URL attracts spam
  with no way to moderate without accounts, and it goes against principle 4.
- **No random chat** with strangers.
- **No blocking someone from opening two tabs with two names.** Without
  accounts it can't really be enforced: an incognito window or another
  browser gets around it.
