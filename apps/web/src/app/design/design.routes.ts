import { Routes } from '@angular/router';

export const designRoutes: Routes = [
  { path: '', loadComponent: () => import('./design-board').then((m) => m.DesignBoard) },
  { path: 'frame', loadComponent: () => import('./design-frame').then((m) => m.DesignFrame) },
  { path: 'logos', loadComponent: () => import('./design-logos').then((m) => m.DesignLogos) },
  {
    path: 'logos/sheet',
    loadComponent: () => import('./design-logos').then((m) => m.DesignLogoSheet),
  },
];
