import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'login-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class WpLoginAppComponent implements OnInit{
  title = 'wp-login';
  constructor(){
  }
  ngOnInit() { 
    console.log('login');
  }
}
