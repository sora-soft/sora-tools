import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {YuiDeployComponent} from './yui-deploy.component';

const routes: Routes = [
  { path: '', component: YuiDeployComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class YuiDeployRoutingModule { }
