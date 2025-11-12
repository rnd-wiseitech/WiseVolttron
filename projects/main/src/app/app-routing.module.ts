import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WorkflowAppComponent } from 'projects/workflow/src/app/app.component';
import { AuthGuard } from 'projects/wp-lib/src/lib/wp-auth/authguard';
import { DMAppComponent } from 'projects/data-manager/src/app/app.component';
import { UserManagerAppComponent } from 'projects/user-manager/src/app/app.component';
import { AlgorithmAppComponent } from 'projects/algorithm-manager/src/app/app.component';
import { WpSigninComponent } from 'projects/wp-login/src/app/login/signin/signin.component';

const routes: Routes = [
  {
      "path": "",
      "canActivate": [AuthGuard],
      "children": [
          {
              path: '',
              redirectTo: 'workflow',
              pathMatch: 'full'
          },
          {
            "path": "workflow",
            "component":WorkflowAppComponent,
            "loadChildren": () => import('../../../workflow/src/app/app.module').then(m => m.WmSharedModule),
          },
          {
            "path": "dm",
            "component":DMAppComponent,
            "loadChildren": () => import('../../../data-manager/src/app/app.module').then(m => m.DMSharedModule),
          },
          {
            "path": "usermng",
            "component":UserManagerAppComponent,
            "loadChildren": () => import('../../../user-manager/src/app/app.module').then(m => m.UserManagerSharedModule),
          },
          {
          "path": "modelmng",
          "component": AlgorithmAppComponent,
          "loadChildren": () => import('../../../algorithm-manager/src/app/app.module').then(m => m.AlgorithmSharedModule),
          },
      ]
  },
  {
    "path": "login",
    "component": WpSigninComponent,
    "loadChildren": () => import('../../../wp-login/src/app/app.module').then(m => m.WpLoginSharedModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
