import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { YuiDeployComponent } from './yui-deploy.component';
import {YuiDeployRoutingModule} from './yui-deploy-routing.module';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzFormModule } from 'ng-zorro-antd/form';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { MarkdownModule } from 'ngx-markdown';

@NgModule({
  declarations: [
    YuiDeployComponent
  ],
  imports: [
    CommonModule,
    YuiDeployRoutingModule,
    NzStepsModule,
    ReactiveFormsModule,
    FormsModule,
    NzFormModule,
    NzRadioModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    MarkdownModule.forChild(),
  ]
})
export class YuiDeployModule { }
