import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WorkflowAppComponent } from 'projects/workflow/src/app/app.component';
import { AuthGuard } from 'projects/wp-lib/src/lib/wp-auth/authguard';

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
      ]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
