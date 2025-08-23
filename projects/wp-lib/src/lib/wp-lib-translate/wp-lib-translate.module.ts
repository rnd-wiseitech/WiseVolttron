import { HttpClient } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { TranslateLoader, TranslateModule } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";

@NgModule({})
export class WpTranslateSharedModule{
  static forRoot() {
    return TranslateModule.forRoot({
        defaultLanguage: 'ko',
        loader: {
            provide: TranslateLoader,
            useFactory: HttpLoaderFactory,
            deps: [HttpClient],
        }
    })
  }
}
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http,'./assets/i18n/','.json');
}