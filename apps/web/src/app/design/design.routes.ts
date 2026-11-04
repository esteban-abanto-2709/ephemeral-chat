import { Routes } from '@angular/router';

export const designRoutes: Routes = [
  { path: '', loadComponent: () => import('./design-board').then((m) => m.DesignBoard) },
  { path: 'frame', loadComponent: () => import('./design-frame').then((m) => m.DesignFrame) },
];
