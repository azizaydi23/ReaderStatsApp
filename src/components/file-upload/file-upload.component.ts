import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileUploadComponent {
  error = input<string | null>(null);
  canCancel = input<boolean>(false);

  fileSelected = output<File>();
  loadExample = output<void>();
  cancel = output<void>();

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileSelected.emit(input.files[0]);
    }
  }

  onExampleClick() {
    this.loadExample.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
