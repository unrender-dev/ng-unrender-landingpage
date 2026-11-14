import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  {
    path: 'inicio',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'sobre',
    loadComponent: () => import('./pages/sobre/sobre').then((m) => m.Sobre),
  },
  {
    path: 'loja',
    loadComponent: () => import('./pages/loja/loja').then((m) => m.Loja),
  },
  {
    path: 'politica',
    loadComponent: () => import('./pages/politica/politica').then((m) => m.Politica),
  },
  // ecossistema disabled
  // {
  //   path: 'ecossistema',
  //   loadComponent: () => import('./pages/ecosistema/ecosistema').then((m) => m.Ecosistema),
  // },
  {
    path: 'arcade',
    loadComponent: () => import('./components/galaga-game/galaga-game.component').then((m) => m.GalagaArcadeComponent),
  },
  // Endereço antigo do jogo: mantém links já compartilhados funcionando.
  { path: 'galaga', redirectTo: 'arcade', pathMatch: 'full' },
  { path: '**', redirectTo: 'inicio' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      anchorScrolling: 'enabled',
      scrollPositionRestoration: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
