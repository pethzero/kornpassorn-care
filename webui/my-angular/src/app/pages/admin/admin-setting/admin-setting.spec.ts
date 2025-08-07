import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSetting } from './admin-setting';

describe('AdminSetting', () => {
  let component: AdminSetting;
  let fixture: ComponentFixture<AdminSetting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSetting]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminSetting);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
