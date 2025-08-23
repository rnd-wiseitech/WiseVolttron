import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WpLibComponent } from './wp-lib.component';

describe('WpLibComponent', () => {
  let component: WpLibComponent;
  let fixture: ComponentFixture<WpLibComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WpLibComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WpLibComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
