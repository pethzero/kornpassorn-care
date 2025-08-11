import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FinanceService, FinanceRecord } from '../../../core/services/finance.service';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-finance-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    // Angular Material
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    // PrimeNG
    CardModule,
    ButtonModule,
    InputTextModule,
    MessageModule
  ],
  template: `
    <div class="finance-form-container">
      <mat-card class="form-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>{{ isEditMode ? 'edit' : 'add' }}</mat-icon>
            {{ isEditMode ? 'Edit Finance Record' : 'Add Finance Record' }}
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="financeForm" (ngSubmit)="onSubmit()">
            <!-- Type Selection -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Transaction Type</mat-label>
              <mat-select formControlName="type" required>
                <mat-option value="income">Income</mat-option>
                <mat-option value="expense">Expense</mat-option>
              </mat-select>
              <mat-error *ngIf="financeForm.get('type')?.hasError('required')">
                Transaction type is required
              </mat-error>
            </mat-form-field>

            <!-- Amount -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Amount</mat-label>
              <input matInput 
                     type="number" 
                     formControlName="amount" 
                     placeholder="0.00"
                     required>
              <span matPrefix>฿&nbsp;</span>
              <mat-error *ngIf="financeForm.get('amount')?.hasError('required')">
                Amount is required
              </mat-error>
              <mat-error *ngIf="financeForm.get('amount')?.hasError('min')">
                Amount must be greater than 0
              </mat-error>
            </mat-form-field>

            <!-- Category -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Category</mat-label>
              <mat-select formControlName="category" required>
                <mat-option *ngFor="let category of categories" [value]="category.value">
                  {{ category.label }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="financeForm.get('category')?.hasError('required')">
                Category is required
              </mat-error>
            </mat-form-field>

            <!-- Description -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput 
                        formControlName="description" 
                        rows="3"
                        placeholder="Enter transaction description"
                        required></textarea>
              <mat-error *ngIf="financeForm.get('description')?.hasError('required')">
                Description is required
              </mat-error>
            </mat-form-field>

            <!-- Date -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Transaction Date</mat-label>
              <input matInput 
                     [matDatepicker]="picker" 
                     formControlName="transaction_date"
                     required>
              <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
              <mat-error *ngIf="financeForm.get('transaction_date')?.hasError('required')">
                Transaction date is required
              </mat-error>
            </mat-form-field>

            <!-- Notes -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notes (Optional)</mat-label>
              <textarea matInput 
                        formControlName="notes" 
                        rows="2"
                        placeholder="Additional notes"></textarea>
            </mat-form-field>

            <!-- Form Actions -->
            <div class="form-actions">
              <button mat-button 
                      type="button" 
                      (click)="onCancel()"
                      [disabled]="loading">
                Cancel
              </button>
              <button mat-raised-button 
                      color="primary" 
                      type="submit"
                      [disabled]="financeForm.invalid || loading">
                <mat-icon>{{ loading ? 'hourglass_empty' : 'save' }}</mat-icon>
                {{ loading ? 'Saving...' : (isEditMode ? 'Update' : 'Save') }}
              </button>
            </div>
          </form>

          <!-- Error/Success Messages -->
          <div *ngIf="errorMessage" class="message error">
            <mat-icon>error</mat-icon>
            {{ errorMessage }}
          </div>
          
          <div *ngIf="successMessage" class="message success">
            <mat-icon>check_circle</mat-icon>
            {{ successMessage }}
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrl: './finance-form.component.scss'
})
export class FinanceFormComponent implements OnInit {
  financeForm: FormGroup;
  isEditMode = false;
  recordId: string | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';

  categories = [
    // Income categories
    { label: 'Salary', value: 'salary' },
    { label: 'Business', value: 'business' },
    { label: 'Investment', value: 'investment' },
    { label: 'Other Income', value: 'other_income' },
    
    // Expense categories
    { label: 'Food & Dining', value: 'food' },
    { label: 'Transportation', value: 'transport' },
    { label: 'Shopping', value: 'shopping' },
    { label: 'Entertainment', value: 'entertainment' },
    { label: 'Bills & Utilities', value: 'bills' },
    { label: 'Healthcare', value: 'healthcare' },
    { label: 'Education', value: 'education' },
    { label: 'Other Expense', value: 'other_expense' }
  ];

  constructor(
    private fb: FormBuilder,
    private financeService: FinanceService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.financeForm = this.createForm();
  }

  ngOnInit() {
    // Check if we're in edit mode
    this.recordId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.recordId;

    // Check query params for pre-selected type
    const queryType = this.route.snapshot.queryParamMap.get('type');
    if (queryType && ['income', 'expense'].includes(queryType)) {
      this.financeForm.patchValue({ type: queryType });
    }

    // Load record for editing
    if (this.isEditMode && this.recordId) {
      this.loadRecord(this.recordId);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      type: ['expense', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      category: ['', Validators.required],
      description: ['', Validators.required],
      transaction_date: [new Date(), Validators.required],
      notes: ['']
    });
  }

  loadRecord(id: string) {
    this.loading = true;
    this.financeService.getFinanceRecord(Number(id)).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const record = response.data;
          this.financeForm.patchValue({
            type: record.category, // Map category to type
            amount: record.amount,
            category: record.category,
            description: record.description || record.item_name,
            transaction_date: new Date(record.record_date),
            notes: record.notes || ''
          });
        } else {
          this.errorMessage = 'Record not found';
        }
        this.loading = false;
      },
      error: (error: any) => {
        this.errorMessage = 'Error loading record';
        console.error('Error loading record:', error);
        this.loading = false;
      }
    });
  }

  onSubmit() {
    if (this.financeForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formData = { ...this.financeForm.value };
      
      // Format date
      if (formData.transaction_date instanceof Date) {
        formData.transaction_date = formData.transaction_date.toISOString().split('T')[0];
      }

      const operation = this.isEditMode 
        ? this.financeService.updateFinanceRecord(Number(this.recordId), formData)
        : this.financeService.createFinanceRecord(formData);

      operation.subscribe({
        next: (response: any) => {
          if (response.success) {
            this.successMessage = this.isEditMode 
              ? 'Record updated successfully!' 
              : 'Record created successfully!';
            
            // Redirect after a short delay
            setTimeout(() => {
              this.router.navigate(['/finance/list']);
            }, 1500);
          } else {
            this.errorMessage = response.message;
          }
          this.loading = false;
        },
        error: (error: any) => {
          this.errorMessage = 'An error occurred while saving the record';
          console.error('Error saving record:', error);
          this.loading = false;
        }
      });
    }
  }

  onCancel() {
    this.router.navigate(['/finance/list']);
  }
}
