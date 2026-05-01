import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

// PrimeNG v19/20 standalone imports
import { StepperModule } from 'primeng/stepper';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

// Lucide Icons
import { LucideAngularModule, Upload, CheckCircle, ShoppingCart, AlertCircle } from 'lucide-angular';

import { ApiService, ProcessedReceipt, ProcessedReceiptItem } from '../../core/services/api.service';

type StepIndex = 0 | 1 | 2;

interface ReviewItem extends ProcessedReceiptItem {
  selected: boolean;
  product_id?: string;
}

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StepperModule,
    FileUploadModule,
    ButtonModule,
    CardModule,
    TableModule,
    InputNumberModule,
    SelectModule,
    ToastModule,
    ProgressSpinnerModule,
    TagModule,
    LucideAngularModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast position="top-center" />

    <div class="page-header">
      <h1>Scanner de Nota</h1>
      <p>Fotografe a nota fiscal e o AI extrai os itens automaticamente</p>
    </div>

    <div class="page-content">
      <p-stepper [value]="activeStep()" styleClass="w-full">

        <!-- STEP 1: Upload -->
        <p-stepper-panel value="0">
          <ng-template pTemplate="header" let-activateCallback="activateCallback">
            <div class="flex items-center gap-2 cursor-pointer" (click)="activateCallback()">
              <lucide-icon [img]="UploadIcon" class="w-4 h-4" />
              <span class="text-sm font-medium">Upload</span>
            </div>
          </ng-template>
          <ng-template pTemplate="content" let-activateCallback="activateCallback">
            <div class="mt-4">
              @if (!selectedFile()) {
                <p-fileupload
                  mode="advanced"
                  accept="image/*"
                  [maxFileSize]="10000000"
                  [auto]="false"
                  chooseLabel="Selecionar Imagem"
                  [showUploadButton]="false"
                  [showCancelButton]="false"
                  styleClass="w-full"
                  (onSelect)="onFileSelect($event)"
                >
                  <ng-template pTemplate="empty">
                    <div class="flex flex-col items-center justify-center py-10 text-center">
                      <lucide-icon [img]="UploadIcon" class="w-12 h-12 mb-3 text-gray-300" />
                      <p class="text-gray-500 font-medium">Arraste a nota fiscal aqui</p>
                      <p class="text-gray-400 text-sm mt-1">ou clique para selecionar (JPG, PNG, HEIC)</p>
                    </div>
                  </ng-template>
                </p-fileupload>
              }

              @if (selectedFile()) {
                <div class="hgo-card flex flex-col items-center gap-4">
                  <img
                    [src]="previewUrl()"
                    alt="Preview"
                    class="max-h-64 rounded-lg object-contain w-full"
                  />
                  <p class="text-sm text-gray-500">{{ selectedFile()!.name }}</p>
                  <div class="flex gap-2 w-full">
                    <p-button
                      label="Trocar Imagem"
                      severity="secondary"
                      [outlined]="true"
                      size="small"
                      class="flex-1"
                      (click)="clearFile()"
                    />
                    <p-button
                      label="Processar com IA"
                      size="small"
                      class="flex-1"
                      [loading]="processing()"
                      (click)="processReceipt(activateCallback)"
                    />
                  </div>
                </div>
              }
            </div>
          </ng-template>
        </p-stepper-panel>

        <!-- STEP 2: Review -->
        <p-stepper-panel value="1">
          <ng-template pTemplate="header" let-activateCallback="activateCallback">
            <div class="flex items-center gap-2 cursor-pointer" (click)="activeStep() >= 1 && activateCallback()">
              <lucide-icon [img]="ReviewIcon" class="w-4 h-4" />
              <span class="text-sm font-medium">Revisão</span>
            </div>
          </ng-template>
          <ng-template pTemplate="content" let-activateCallback="activateCallback">
            <div class="mt-4">
              @if (receiptData()) {
                <div class="hgo-card mb-4">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm text-gray-500">Mercado</span>
                    <span class="font-semibold">{{ receiptData()!.market }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-500">Itens encontrados</span>
                    <p-tag [value]="receiptData()!.items.length + ' itens'" severity="info" />
                  </div>
                </div>

                <p-table
                  [value]="reviewItems()"
                  [scrollable]="true"
                  scrollHeight="340px"
                  styleClass="p-datatable-sm"
                >
                  <ng-template pTemplate="header">
                    <tr>
                      <th style="width:2.5rem"></th>
                      <th>Produto</th>
                      <th>Qtd</th>
                      <th>Preço</th>
                      <th>Categoria</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-item let-i="rowIndex">
                    <tr [class.opacity-40]="!item.selected">
                      <td>
                        <input type="checkbox" [(ngModel)]="reviewItems()[i].selected" class="accent-indigo-500" />
                      </td>
                      <td>
                        <div class="text-sm font-medium leading-tight">{{ item.clean_name }}</div>
                        <div class="text-xs text-gray-400">{{ item.raw_name }}</div>
                      </td>
                      <td>
                        <p-inputnumber
                          [(ngModel)]="reviewItems()[i].qty"
                          [min]="1"
                          [showButtons]="true"
                          buttonLayout="horizontal"
                          [style]="{ width: '90px' }"
                          inputStyleClass="text-center text-sm p-1"
                          size="small"
                        />
                      </td>
                      <td class="text-sm">{{ item.unit_price | currency:'BRL' }}</td>
                      <td>
                        <p-tag
                          [value]="item.category"
                          [severity]="getCategorySeverity(item.category)"
                        />
                      </td>
                    </tr>
                  </ng-template>
                </p-table>

                <div class="flex gap-2 mt-4">
                  <p-button
                    label="Voltar"
                    severity="secondary"
                    [outlined]="true"
                    size="small"
                    class="flex-1"
                    (click)="goToStep(0, activateCallback)"
                  />
                  <p-button
                    [label]="'Salvar ' + selectedCount() + ' itens'"
                    size="small"
                    class="flex-1"
                    [disabled]="selectedCount() === 0"
                    [loading]="saving()"
                    (click)="savePurchase(activateCallback)"
                  />
                </div>
              }
            </div>
          </ng-template>
        </p-stepper-panel>

        <!-- STEP 3: Confirmation -->
        <p-stepper-panel value="2">
          <ng-template pTemplate="header">
            <div class="flex items-center gap-2">
              <lucide-icon [img]="CheckIcon" class="w-4 h-4" />
              <span class="text-sm font-medium">Confirmação</span>
            </div>
          </ng-template>
          <ng-template pTemplate="content">
            <div class="mt-4 flex flex-col items-center text-center py-8">
              <lucide-icon [img]="CheckIcon" class="w-16 h-16 text-green-500 mb-4" />
              <h2 class="text-xl font-bold text-gray-800 mb-2">Compra salva!</h2>
              <p class="text-gray-500 text-sm mb-6">
                {{ savedCount() }} {{ savedCount() === 1 ? 'item foi adicionado' : 'itens foram adicionados' }} ao estoque.
              </p>
              <p-button
                label="Nova Nota"
                (click)="reset()"
                size="small"
              />
            </div>
          </ng-template>
        </p-stepper-panel>

      </p-stepper>
    </div>
  `,
})
export class ScannerComponent {
  private readonly api = inject(ApiService);
  private readonly messageService = inject(MessageService);

  readonly UploadIcon = Upload;
  readonly CheckIcon = CheckCircle;
  readonly ReviewIcon = ShoppingCart;
  readonly ErrorIcon = AlertCircle;

  // State signals
  readonly activeStep = signal<number>(0);
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly processing = signal(false);
  readonly saving = signal(false);
  readonly receiptData = signal<ProcessedReceipt | null>(null);
  readonly reviewItems = signal<ReviewItem[]>([]);
  readonly savedCount = signal(0);

  readonly selectedCount = computed(
    () => this.reviewItems().filter((i) => i.selected).length
  );

  onFileSelect(event: { files: File[] }): void {
    const file = event.files?.[0];
    if (!file) return;
    this.selectedFile.set(file);
    const reader = new FileReader();
    reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  processReceipt(activateCallback: (step: number) => void): void {
    const file = this.selectedFile();
    if (!file) return;

    this.processing.set(true);
    this.api.processReceipt(file).subscribe({
      next: (data) => {
        this.processing.set(false);
        this.receiptData.set(data);
        this.reviewItems.set(
          data.items.map((item) => ({ ...item, selected: true }))
        );
        this.goToStep(1, activateCallback);
        this.messageService.add({
          severity: 'success',
          summary: 'Nota processada!',
          detail: `${data.items.length} itens encontrados em ${data.market}`,
          life: 3000,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.processing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro ao processar',
          detail: err.error?.message ?? 'Verifique a imagem e tente novamente',
          life: 5000,
        });
      },
    });
  }

  savePurchase(activateCallback: (step: number) => void): void {
    const receipt = this.receiptData();
    const items = this.reviewItems().filter((i) => i.selected);
    if (!receipt || items.length === 0) return;

    this.saving.set(true);
    const totalValue = items.reduce((acc, i) => acc + i.qty * i.unit_price, 0);

    this.api
      .savePurchase({
        origin: receipt.market,
        total_value: totalValue,
        items: items.map((i) => ({
          product_id: i.product_id ?? i.clean_name.toLowerCase().replace(/\s+/g, '_'),
          qty: i.qty,
          price: i.unit_price,
        })),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.savedCount.set(items.length);
          this.goToStep(2, activateCallback);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro ao salvar',
            detail: err.error?.message ?? 'Tente novamente',
            life: 5000,
          });
        },
      });
  }

  goToStep(step: number, activateCallback: (step: number) => void): void {
    this.activeStep.set(step);
    activateCallback(step);
  }

  reset(): void {
    this.activeStep.set(0);
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.receiptData.set(null);
    this.reviewItems.set([]);
    this.savedCount.set(0);
  }

  getCategorySeverity(category: string): 'success' | 'info' | 'warn' | 'danger' | undefined {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger'> = {
      Mantimentos: 'success',
      Limpeza: 'info',
      Higiene: 'warn',
      Objetos: 'danger',
    };
    return map[category];
  }
}
