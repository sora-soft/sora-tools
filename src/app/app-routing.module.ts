import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/yui-deploy' },
  { path: 'yui-deploy', loadChildren: () => import('./pages/yui-deploy/yui-deploy.module').then(m => m.YuiDeployModule) }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
