import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'textarea' | 'date' | 'select';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { label: string; value: any; }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CardModule, 
    InputTextModule, 
    ButtonModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormBuilderComponent),
      multi: true
    }
  ],
  template: `
    <p-card class="form-builder-widget">
      <ng-template pTemplate="header">
        <div class="flex justify-content-between align-items-center p-3">
          <div>
            <h3 class="m-0 text-900">{{ title }}</h3>
            <p class="text-600 mt-1 mb-0">{{ subtitle }}</p>
          </div>
        </div>
      </ng-template>

      <form class="form-grid" (ngSubmit)="onSubmit()" #form="ngForm">
        <div class="grid">
          @for (field of fields; track field.key) {
            <div class="col-12 md:col-6 lg:col-{{ getColumnSize(field) }}">
              <div class="field">
                <label [for]="field.key" class="field-label">
                  {{ field.label }}
                  @if (field.required) {
                    <span class="required-marker">*</span>
                  }
                </label>

                @switch (field.type) {
                  @case ('textarea') {
                    <textarea
                      [id]="field.key"
                      [name]="field.key"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required || false"
                      [disabled]="field.disabled || false"
                      [value]="formData[field.key] || ''"
                      (input)="onFieldChange(field.key, $event)"
                      class="w-full p-inputtext"
                      rows="3">
                    </textarea>
                  }
                  @case ('date') {
                    <input
                      [id]="field.key"
                      [name]="field.key"
                      type="date"
                      [placeholder]="field.placeholder || 'เลือกวันที่'"
                      [required]="field.required || false"
                      [disabled]="field.disabled || false"
                      [value]="formData[field.key] || ''"
                      (input)="onFieldChange(field.key, $event)"
                      class="w-full p-inputtext"
                    />
                  }
                  @case ('select') {
                    <select
                      [id]="field.key"
                      [name]="field.key"
                      [required]="field.required || false"
                      [disabled]="field.disabled || false"
                      [value]="formData[field.key] || ''"
                      (change)="onFieldChange(field.key, $event)"
                      class="w-full p-inputtext p-component">
                      <option value="">{{ field.placeholder || 'เลือก...' }}</option>
                      @if (field.options) {
                        @for (option of field.options; track option.value) {
                          <option [value]="option.value">{{ option.label }}</option>
                        }
                      }
                    </select>
                  }
                  @default {
                    <input
                      [id]="field.key"
                      [name]="field.key"
                      [type]="field.type"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required || false"
                      [disabled]="field.disabled || false"
                      [value]="formData[field.key] || ''"
                      (input)="onFieldChange(field.key, $event)"
                      class="w-full p-inputtext"
                    />
                  }
                }

                @if (getFieldError(field.key)) {
                  <small class="field-error">{{ getFieldError(field.key) }}</small>
                }
              </div>
            </div>
          }
        </div>

        @if (showActions) {
          <div class="form-actions mt-4">
            <div class="flex gap-2 justify-content-end">
              @if (showCancelButton) {
                <p-button 
                  label="ยกเลิก" 
                  [severity]="'secondary'"
                  [outlined]="true"
                  (onClick)="onCancel()">
                </p-button>
              }
              <p-button 
                label="บันทึก" 
                [severity]="'primary'"
                type="submit"
                [disabled]="!isFormValid()"
                [loading]="loading">
              </p-button>
            </div>
          </div>
        }
      </form>
    </p-card>
  `,
  styleUrls: ['./form-builder.scss']
})
export class FormBuilderComponent implements ControlValueAccessor {
  @Input() title: string = 'ฟอร์ม';
  @Input() subtitle: string = '';
  @Input() fields: FormField[] = [];
  @Input() showActions: boolean = true;
  @Input() showCancelButton: boolean = true;
  @Input() loading: boolean = false;

  @Output() submit = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  formData: any = {};
  errors: { [key: string]: string } = {};

  private onChange = (value: any) => {};
  private onTouched = () => {};

  writeValue(value: any): void {
    this.formData = value || {};
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onFieldChange(key: string, event: any) {
    const value = event.target ? event.target.value : event;
    this.formData[key] = value;
    this.validateField(key);
    this.onChange(this.formData);
    this.onTouched();
  }

  onFieldDateChange(key: string, value: any) {
    this.formData[key] = value;
    this.validateField(key);
    this.onChange(this.formData);
    this.onTouched();
  }

  validateField(key: string) {
    const field = this.fields.find(f => f.key === key);
    if (!field) return;

    const value = this.formData[key];
    delete this.errors[key];

    if (field.required && (!value || value.toString().trim() === '')) {
      this.errors[key] = `${field.label} จำเป็นต้องกรอก`;
      return;
    }

    if (field.validation && value) {
      const validation = field.validation;
      
      if (validation.minLength && value.length < validation.minLength) {
        this.errors[key] = `${field.label} ต้องมีอย่างน้อย ${validation.minLength} ตัวอักษร`;
        return;
      }

      if (validation.maxLength && value.length > validation.maxLength) {
        this.errors[key] = `${field.label} ต้องไม่เกิน ${validation.maxLength} ตัวอักษร`;
        return;
      }

      if (validation.min && Number(value) < validation.min) {
        this.errors[key] = `${field.label} ต้องมีค่าอย่างน้อย ${validation.min}`;
        return;
      }

      if (validation.max && Number(value) > validation.max) {
        this.errors[key] = `${field.label} ต้องไม่เกิน ${validation.max}`;
        return;
      }

      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        this.errors[key] = `${field.label} รูปแบบไม่ถูกต้อง`;
        return;
      }
    }
  }

  getFieldError(key: string): string | null {
    return this.errors[key] || null;
  }

  isFormValid(): boolean {
    // Validate all required fields
    for (const field of this.fields) {
      if (field.required) {
        const value = this.formData[field.key];
        if (!value || value.toString().trim() === '') {
          return false;
        }
      }
    }

    // Check for any validation errors
    return Object.keys(this.errors).length === 0;
  }

  getColumnSize(field: FormField): number {
    // Auto-determine column size based on field type
    switch (field.type) {
      case 'textarea':
        return 12;
      case 'date':
      case 'select':
        return 6;
      default:
        return 6;
    }
  }

  onSubmit() {
    // Validate all fields before submit
    this.fields.forEach(field => this.validateField(field.key));
    
    if (this.isFormValid()) {
      this.submit.emit(this.formData);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
