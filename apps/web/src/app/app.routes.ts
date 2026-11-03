import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home-page').then((m) => m.HomePage) },
  { path: 'demo', loadComponent: () => import('./demo/demo-page').then((m) => m.DemoPage) },
  { path: 'room/:id', loadComponent: () => import('./room/room-page').then((m) => m.RoomPage) },
];
