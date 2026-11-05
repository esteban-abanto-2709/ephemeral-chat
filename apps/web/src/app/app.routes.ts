import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./chats/chats-page').then((m) => m.ChatsPage) },
  { path: 'room/:id', loadComponent: () => import('./chats/chats-page').then((m) => m.ChatsPage) },
  ...(DESIGN
    ? [{ path: 'design', loadChildren: () => import('./design/design.routes').then((m) => m.designRoutes) }]
    : []),
  { path: '**', redirectTo: '' },
];
