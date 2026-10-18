import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { DocumentService } from '../../../core/services/document.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { PatientService } from '../../../core/services/patient.service';
import { SettingsService } from '../../../core/services/settings.service';
import { Patient } from '../../../models/users/user.model';
import { InventoryProduct, InventoryProductLot } from '../../../core/models/inventory.model';
import { NewProductDialogComponent, NewProductResult } from '../new-product-dialog/new-product-dialog';
import {
  CreateDocumentItemPayload,
  CreateDocumentPayload,
  DOCUMENT_TYPE_INFO,
  DocumentType,
  documentTypeInfo,
} from '../../../core/models/document.model';

interface Option<T = number> {
  label: string;
  value: T;
  disabled?: boolean;
}

@Component({
  selector: 'app-document-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ToastModule,
    TooltipModule,
    NewProductDialogComponent,
  ],
  templateUrl: './document-form.html',
  styleUrls: ['../../../ui/styles/list-page.scss', './document-form.scss'],
  providers: [MessageService],
})
export class DocumentFormComponent implements OnInit {
  readonly types = DOCUMENT_TYPE_INFO;
  readonly typeInfo = documentTypeInfo;

  form: FormGroup;
  saving = false;

  products: InventoryProduct[] = [];
  productOptions: Option[] = [];
  patientOptions: Option[] = [];
  // ตัวเลือกที่คำนวณครั้งเดียวต่อสินค้า (กัน p-select ได้ array ใหม่ทุกรอบ change detection)
  private packageOptionsCache: Record<number, Option[]> = {};
  private lotsByProduct: Record<number, InventoryProductLot[]> = {};
  private lotOptionsCache: Record<string, Option[]> = {};

  // บริการ + ราคาตั้งต้น — ตั้งค่าได้ที่ ตั้งค่า → คลินิก & บริการ
  serviceOptions: Option<string>[] = [];
  private servicePrices = new Map<string, number | null>();
  issueReasons = ['ใช้ภายในคลินิก', 'ใช้ออกหน่วยเยี่ยมบ้าน', 'แจกฟรี/สนับสนุน'];
  adjustReasons = ['หมดอายุ — ตัดทิ้ง', 'ชำรุด/เสียหาย', 'นับสต็อกไม่ตรง'];
  itemTypeOptions: Option<'service' | 'product'>[] = [
    { label: 'บริการ', value: 'service' },
    { label: 'ยา/เวชภัณฑ์', value: 'product' },
  ];
  directionOptions: Option<'out' | 'in'>[] = [
    { label: 'ลด (−)', value: 'out' },
    { label: 'เพิ่ม (+)', value: 'in' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService,
    private inventoryService: InventoryService,
    private patientService: PatientService,
    private settingsService: SettingsService,
    private messageService: MessageService,
  ) {
    this.form = this.fb.group({
      doc_type: ['receive' as DocumentType, Validators.required],
      doc_date: [this.today(), Validators.required],
      supplier: [''],
      reason: [''],
      patient_id: [null as number | null],
      note: [''],
      items: this.fb.array([]),
    });
  }

  get docType(): DocumentType {
    return this.form.get('doc_type')!.value;
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  line(i: number): FormGroup {
    return this.items.at(i) as FormGroup;
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const type = qp.get('type') as DocumentType | null;
    if (type && DOCUMENT_TYPE_INFO.some((t) => t.value === type)) this.form.patchValue({ doc_type: type });
    if (qp.get('patient_id')) this.form.patchValue({ patient_id: Number(qp.get('patient_id')) });

    this.inventoryService.getProducts({ is_active: true, limit: 200 }).subscribe({
      next: (res) => {
        this.setProducts(res.data);

        // มาจากหน้าสินค้า/ล็อต ("รับเข้ายี่ห้อนี้") → เติมบรรทัดแรกให้
        const productId = qp.get('product_id') ? Number(qp.get('product_id')) : null;
        this.resetItems();
        if (productId) {
          const first = this.line(0);
          first.patchValue({ item_type: 'product', product_id: productId });
          this.onProductChange(0);
          if (qp.get('package_id')) {
            first.patchValue({ package_id: Number(qp.get('package_id')) });
            this.onPackageChange(0);
          }
        }
      },
    });
    this.settingsService.activeServices().subscribe({
      next: (services) => {
        this.serviceOptions = services.map((s) => ({ label: s.price != null ? `${s.name} · ${Number(s.price).toLocaleString('th-TH')} ฿` : s.name, value: s.name }));
        this.servicePrices = new Map(services.map((s) => [s.name, s.price]));
      },
    });
    this.patientService.getPatients().subscribe({
      next: (patients: Patient[]) => {
        this.patientOptions = patients.map((p: any) => ({
          label: `${p.first_name} ${p.last_name}${p.patient_code ? ` (${p.patient_code})` : ''}`,
          value: p.id,
        }));
      },
    });
  }

  // ----- ประเภทเอกสาร -----

  selectType(type: DocumentType): void {
    if (type === this.docType) return;
    this.form.patchValue({ doc_type: type, reason: '', supplier: '' });
    this.resetItems();
  }

  private resetItems(): void {
    this.items.clear();
    this.addLine();
  }

  private setProducts(products: InventoryProduct[]): void {
    this.products = products;
    this.productOptions = products.map((p) => ({
      label: `${p.name} — เหลือ ${Number(p.stock_remaining ?? 0).toLocaleString('th-TH')} ${p.unit || ''}`,
      value: p.id!,
    }));
    this.packageOptionsCache = {};
  }

  // ----- รับของเข้า: สร้างสินค้าใหม่ / ยี่ห้อใหม่ (modal) แล้วเติมลงแถวในตาราง -----

  showNewDialog = false;
  newDialogMode: 'product' | 'package' = 'product';
  newDialogProduct: InventoryProduct | null = null;
  // แถวที่จะเติมผลลัพธ์ (null = เพิ่มแถวใหม่)
  private newDialogRow: number | null = null;

  openNewProduct(row: number | null = null): void {
    this.newDialogMode = 'product';
    this.newDialogProduct = null;
    this.newDialogRow = row;
    this.showNewDialog = true;
  }

  openNewPackage(row: number): void {
    const product = this.product(row);
    if (!product) return;
    this.newDialogMode = 'package';
    this.newDialogProduct = product;
    this.newDialogRow = row;
    this.showNewDialog = true;
  }

  onNewSaved(result: NewProductResult): void {
    this.onProductSaved(result.product);
    let row = this.newDialogRow;
    // ปุ่มล่างตาราง: ใช้แถวว่างสุดท้ายถ้ามี ไม่งั้นเพิ่มแถวใหม่
    if (row == null) {
      const last = this.items.length - 1;
      row = last >= 0 && !this.line(last).value.product_id ? last : (this.addLine('product'), this.items.length - 1);
    }
    const line = this.line(row);
    if (this.newDialogMode === 'product') {
      line.patchValue({ product_id: result.product.id, package_id: result.packageId, unit_price: null, quantity: line.value.quantity ?? 1 });
    } else {
      line.patchValue({ package_id: result.packageId });
      this.onPackageChange(row);
    }
  }

  // สร้างสินค้า/ยี่ห้อใหม่แล้ว → อัปเดตรายการสินค้าในหน้านี้ (ตัวเลือก dropdown + cache ยี่ห้อ)
  onProductSaved(product: InventoryProduct): void {
    const exists = this.products.some((p) => p.id === product.id);
    const next = exists ? this.products.map((p) => (p.id === product.id ? product : p)) : [...this.products, product];
    this.setProducts(next.sort((a, b) => a.name.localeCompare(b.name, 'th')));
  }



  addLine(itemType: 'product' | 'service' = this.docType === 'patient_service' ? 'service' : 'product'): void {
    this.items.push(
      this.fb.group({
        item_type: [itemType],
        direction: ['out'],
        category: [null as string | null],
        product_id: [null as number | null],
        package_id: [null as number | null],
        product_lot_id: [null as number | null],
        lot_no: [''],
        expiry_date: [''],
        quantity: [(itemType === 'service' ? 1 : null) as number | null],
        unit_price: [null as number | null],
        amount: [null as number | null],
        description: [''],
      }),
    );
  }

  removeLine(i: number): void {
    if (this.items.length > 1) this.items.removeAt(i);
  }

  // ----- สินค้า / ยี่ห้อ / ล็อต -----

  product(i: number): InventoryProduct | undefined {
    const id = this.line(i).get('product_id')?.value;
    return this.products.find((p) => p.id === id);
  }

  onItemTypeChange(i: number): void {
    const isService = this.line(i).value.item_type === 'service';
    this.line(i).patchValue({
      category: null,
      product_id: null,
      product_lot_id: null,
      description: '',
      quantity: isService ? 1 : null,
      unit_price: null,
      amount: null,
    });
  }

  // เลือกบริการที่ตั้งราคาไว้ → เติมราคาให้ (แก้ต่อได้)
  onServiceChange(i: number): void {
    const price = this.servicePrices.get(this.line(i).value.category);
    if (price != null) this.line(i).patchValue({ unit_price: Number(price) });
  }

  onProductChange(i: number): void {
    const line = this.line(i);
    const product = this.product(i);
    const defaultPkg = product?.packages?.find((p) => p.is_default && p.is_active !== false);
    line.patchValue({
      product_lot_id: null,
      package_id: this.docType === 'receive' ? (defaultPkg?.id ?? null) : null,
      quantity: line.get('quantity')?.value ?? 1,
      unit_price:
        this.docType === 'patient_service' && product?.sell_price != null
          ? Number(product.sell_price)
          : this.docType === 'receive' && defaultPkg?.last_pack_cost != null
            ? Number(defaultPkg.last_pack_cost)
            : null,
    });
    if (product?.id && this.docType !== 'receive' && !this.lotsByProduct[product.id]) {
      this.inventoryService.getLots({ product_id: product.id, limit: 100 }).subscribe({
        next: (res) => {
          this.lotsByProduct[product.id!] = res.data;
          Object.keys(this.lotOptionsCache)
            .filter((k) => k.startsWith(`${product.id}|`))
            .forEach((k) => delete this.lotOptionsCache[k]);
        },
      });
    }
  }

  packageOptions(i: number): Option[] {
    const product = this.product(i);
    if (!product?.id) return [];
    return (this.packageOptionsCache[product.id] ??= (product.packages || [])
      .filter((p) => p.is_active !== false)
      .map((p) => ({ label: `${p.brand} — ${p.pack_unit}ละ ${p.pack_size} ${product.unit || ''}`, value: p.id! })));
  }

  onPackageChange(i: number): void {
    const pkg = this.selectedPackage(i);
    this.line(i).patchValue({ unit_price: pkg?.last_pack_cost != null ? Number(pkg.last_pack_cost) : null });
  }

  selectedPackage(i: number) {
    const id = this.line(i).get('package_id')?.value;
    return this.product(i)?.packages?.find((p) => p.id === id);
  }

  // หน่วยของช่องจำนวน: รับเป็นแพ็คถ้าเลือกยี่ห้อ ไม่งั้นหน่วยย่อย
  qtyUnit(i: number): string {
    if (this.docType === 'receive' && this.selectedPackage(i)) return this.selectedPackage(i)!.pack_unit;
    return this.product(i)?.unit || 'หน่วย';
  }

  lotOptions(i: number): Option[] {
    const product = this.product(i);
    if (!product?.id) return [];
    const mode = this.docType === 'adjust' ? this.line(i).get('direction')?.value : 'use';
    const key = `${product.id}|${mode}`;
    const lots = this.lotsByProduct[product.id];
    if (!lots) return [];
    return (this.lotOptionsCache[key] ??= lots
      // ใช้จ่าย: ซ่อนล็อตหมด/หมดอายุ (FEFO ฝั่ง backend ก็ข้ามอยู่แล้ว) | ปรับยอดลด: เห็นล็อตหมดอายุด้วย | ปรับยอดเพิ่ม: ทุกล็อต
      .filter((l) => (mode === 'in' ? true : Number(l.quantity_remaining) > 0))
      .filter((l) => (mode === 'use' ? !this.isExpired(l.expiry_date) : true))
      .map((l) => ({
        label: `${l.lot_no} · เหลือ ${Number(l.quantity_remaining)} · ${l.expiry_date ? (this.isExpired(l.expiry_date) ? 'หมดอายุแล้ว' : 'หมด ' + this.shortDate(l.expiry_date)) : 'ไม่มีวันหมดอายุ'}`,
        value: l.id!,
      })));
  }

  onDirectionChange(i: number): void {
    this.line(i).patchValue({ product_lot_id: null });
  }

  // ----- ยอดเงิน -----

  lineAmount(i: number): number {
    const v = this.line(i).value;
    if (v.item_type === 'service') {
      return Math.round((Number(v.quantity) || 1) * (Number(v.unit_price) || 0) * 100) / 100;
    }
    if (this.docType === 'issue' || this.docType === 'adjust') return 0;
    return Math.round((Number(v.quantity) || 0) * (Number(v.unit_price) || 0) * 100) / 100;
  }

  total(): number {
    return this.items.controls.reduce((sum, _, i) => sum + this.lineAmount(i), 0);
  }

  // รับเป็นแพ็ค → แสดงว่าได้กี่หน่วยย่อย เช่น "= 300 เม็ด"
  receivedUnits(i: number): string | null {
    const pkg = this.selectedPackage(i);
    const qty = Number(this.line(i).get('quantity')?.value) || 0;
    if (this.docType !== 'receive' || !pkg || !qty) return null;
    return `· ${(qty * pkg.pack_size).toLocaleString('th-TH')} ${this.product(i)?.unit || ''}`;
  }

  // วันหมดอายุแบบย่อบนปุ่มปฏิทิน เช่น "7 เม.ย. 71"
  expiryLabel(i: number): string {
    const v = this.line(i).value.expiry_date;
    return v ? this.shortDate(v) : '';
  }

  // คลิกตรงไหนของปุ่มก็เปิดปฏิทิน (ปกติต้องกดที่ไอคอนเล็กของ input date)
  openPicker(event: Event): void {
    const input = event.target as HTMLInputElement & { showPicker?: () => void };
    try {
      input.showPicker?.();
    } catch {
      // บางเบราว์เซอร์ไม่อนุญาต showPicker — ปล่อยให้ทำงานแบบปกติ
    }
  }

  hasMoney(): boolean {
    return this.docType === 'receive' || this.docType === 'patient_service';
  }

  // ----- บันทึก -----

  submit(): void {
    const v = this.form.value;
    const problem = this.validate();
    if (problem) {
      this.messageService.add({ severity: 'warn', summary: 'กรอกไม่ครบ', detail: problem });
      return;
    }

    const payload: CreateDocumentPayload = {
      doc_type: v.doc_type,
      doc_date: v.doc_date,
      supplier: v.doc_type === 'receive' ? v.supplier || undefined : undefined,
      reason: v.doc_type === 'issue' || v.doc_type === 'adjust' ? v.reason || undefined : undefined,
      patient_id: v.doc_type === 'patient_service' ? v.patient_id : undefined,
      note: v.note || undefined,
      items: this.items.controls.map((_, i) => this.buildLine(i)),
    };

    this.saving = true;
    this.documentService.createDocument(payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.router.navigate(['/documents', res.data.id], {
          state: { toast: { severity: 'success', summary: 'บันทึกแล้ว', detail: res.message } },
        });
      },
      error: (err) => {
        this.saving = false;
        const msg = err.error?.message;
        this.messageService.add({
          severity: 'error',
          summary: 'บันทึกไม่สำเร็จ',
          detail: Array.isArray(msg) ? msg.join(', ') : msg || err.message,
          life: 6000,
        });
      },
    });
  }

  private buildLine(i: number): CreateDocumentItemPayload {
    const v = this.line(i).value;
    if (v.item_type === 'service') {
      const quantity = Number(v.quantity) || 1;
      return {
        item_type: 'service',
        category: v.category,
        quantity,
        unit_price: Number(v.unit_price),
        amount: this.lineAmount(i),
        description: v.description || undefined,
      };
    }
    const base: CreateDocumentItemPayload = {
      item_type: 'product',
      product_id: v.product_id,
      description: v.description || undefined,
    };
    switch (this.docType) {
      case 'receive':
        return {
          ...base,
          lot_no: v.lot_no.trim(),
          expiry_date: v.expiry_date || undefined,
          ...(v.package_id ? { package_id: v.package_id, pack_qty: Number(v.quantity) } : { quantity: Number(v.quantity) }),
          unit_price: v.unit_price != null ? Number(v.unit_price) : undefined,
        };
      case 'patient_service':
        return {
          ...base,
          quantity: Number(v.quantity),
          unit_price: v.unit_price != null ? Number(v.unit_price) : undefined,
          product_lot_id: v.product_lot_id || undefined,
        };
      case 'adjust':
        return { ...base, direction: v.direction, quantity: Number(v.quantity), product_lot_id: v.product_lot_id || undefined };
      default:
        return { ...base, quantity: Number(v.quantity), product_lot_id: v.product_lot_id || undefined };
    }
  }

  // ตรวจเบื้องต้นให้ข้อความอ่านง่าย — กฎจริงอยู่ฝั่ง backend
  private validate(): string | null {
    const v = this.form.value;
    if (!v.doc_date) return 'กรุณาเลือกวันที่เอกสาร';
    if (v.doc_type === 'patient_service' && !v.patient_id) return 'กรุณาเลือกคนไข้';
    if ((v.doc_type === 'adjust' || v.doc_type === 'issue') && !v.reason) return 'กรุณาระบุเหตุผล';
    if (this.items.length === 0) return 'เพิ่มสินค้าอย่างน้อย 1 รายการ';
    for (let i = 0; i < this.items.length; i++) {
      const l = this.line(i).value;
      const n = `บรรทัดที่ ${i + 1}`;
      if (l.item_type === 'service') {
        if (!l.category) return `${n}: เลือกบริการ`;
        if (!(Number(l.unit_price) > 0)) return `${n}: กรอกค่าบริการ`;
        continue;
      }
      if (!l.product_id) return `${n}: เลือกสินค้า`;
      if (!(Number(l.quantity) > 0)) return `${n}: กรอกจำนวน`;
      if (v.doc_type === 'receive' && !l.lot_no?.trim()) return `${n}: กรอกเลขล็อต`;
      if (v.doc_type === 'adjust' && l.direction === 'in' && !l.product_lot_id) return `${n}: ปรับยอดเพิ่มต้องเลือกล็อต`;
    }
    return null;
  }

  // ----- utils -----

  private today(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private isExpired(date?: string | null): boolean {
    if (!date) return false;
    return new Date(date).getTime() < new Date(this.form?.value?.doc_date || this.today()).getTime();
  }

  private shortDate(date: string): string {
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(date));
  }
}
