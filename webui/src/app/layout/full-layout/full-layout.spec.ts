import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullLayout } from './full-layout';

describe('FullLayout', () => {
  let component: FullLayout;
  let fixture: ComponentFixture<FullLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FullLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
