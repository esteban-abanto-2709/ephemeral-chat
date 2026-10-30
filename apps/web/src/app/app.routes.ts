import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home-page').then((m) => m.HomePage) },
  { path: 'room/:id', loadComponent: () => import('./room/room-page').then((m) => m.RoomPage) },
];
