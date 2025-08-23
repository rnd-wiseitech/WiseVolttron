import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { Router } from '@angular/router';
@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    constructor(private router: Router) {}

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add authorization header with jwt token if available
        
        console.log(request.url);

        let currentUser;
        if(localStorage.getItem('currentUser') != null){
            try {
                currentUser = JSON.parse(localStorage.getItem('currentUser'));
                if(request.url.includes('http://localhost:8800/pyservice')){
                    request = request.clone({
                        setHeaders: { 
                            Authorization: `${currentUser}`
                        },
                        withCredentials: true
                    }); 
                }
                else{
                    request = request.clone({
                        setHeaders: { 
                            Authorization: `${currentUser}`
                        }
                    }); 
                }
            } catch (error) {
                console.log(error);
                localStorage.removeItem('currentUser');
                // this.router.navigate(['/intro']);

            }
        }
        else{
            // console.log("null");
            // let chkAuth = request.headers.get('Authorization');
            // if(chkAuth != 'tutorial')
            //     this.router.navigate(['/intro']);
        }

        return next.handle(request).pipe(
            retry(0)
          );
    }
}