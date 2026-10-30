# Product vision

## The idea

**You create a room, share the link, and whoever has it comes in to talk.
When everyone leaves, nothing is left.**

## Principles

They hold in every version. Judge every change against them.

1. **No accounts, no database.** You come in, pick a name and talk.
2. **Truly ephemeral.** The server **never stores messages**: it only relays
   them to whoever is connected at that moment. Someone who joins late sees
   nothing from before. Reloading the page drops everything you had.
3. **The link is the key.** Anyone with the link gets in, even if it was
   forwarded by someone else. Rooms are not limited to two people.
4. **Private by nature.** No public spaces: every conversation happens in a
   room only its link opens.

## User journey (v0.1)

1. You open the site: the Ephemeral Chat home with a **Create room** button.
2. A modal asks for **your name**. It is asked every time you enter a room.
3. You land in the room with a banner: **share this link**, with a copy button.
4. A friend opens the link, enters a name and joins.
5. Everyone sees **"Juan joined"**, the **list of who is in**, and later
   **"Juan left"**.
6. You exchange **text messages** in real time.
7. Everyone leaves: after a **one-minute grace period**, the room is gone and
   its link stops working. The grace period covers someone reloading while
   alone in the room.

## Limits

The link can reach anyone, so the server protects itself from day one:

| Limit | Value |
|---|---|
| Message length | 1000 characters |
| Messages per person | 5 per second |
| Name length | 24 characters |
| People per room | 50 |
| Grace period for an empty room | 1 minute |

They are tuning values, not product rules: each one lives in one place in the
API and can change as the product gets polished.

## Versions

Each version is a milestone. When all its work is done, it gets a git tag
(`v0.1.0`) and a GitHub release built from the changelog.

| Version | Theme | Work |
|---|---|---|
| **v0.1** | The core | The whole user journey above, deployed. Committed: [roadmap](./logbook/roadmap.md) |
| v0.2 | Comfort | Typing indicator |
| v0.3 | Media | Images, voice messages, stickers |
| v0.4 | Privacy | End-to-end encryption |

v0.2 to v0.4 are ideas in the [wishlist](./logbook/wishlist.md) until they
are committed.

**Deploy early.** The app is on Render from the first steps, not at the end,
so "no commit breaks production" means something from day one.

## What it is NOT

Decided against, with the reason, so they are not reopened by accident:

- **No global chat.** A public, anonymous room on an open URL attracts spam
  with no way to moderate without accounts, and it goes against principle 4.
- **No random chat** with strangers.
- **No several rooms open at once** inside the app.
- **No blocking someone from opening two tabs with two names.** Without
  accounts it can't really be enforced: an incognito window or another
  browser gets around it.
