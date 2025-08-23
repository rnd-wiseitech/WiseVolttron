import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WpGridComponent } from './wp-grid.component';

describe('WpGridComponent', () => {
  let component: WpGridComponent;
  let fixture: ComponentFixture<WpGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WpGridComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WpGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
