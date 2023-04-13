import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  async downloadFile(file: Blob, fileName: string) {
    const aTag = document.createElement('a');
    aTag.download = fileName;
    aTag.href = URL.createObjectURL(file);
    aTag.click();
    aTag.remove();
  }

  async uploadFile(accept = '*', multi = false): Promise<FileList> {
    return new Promise((resolve) => {
      const inputTag = document.createElement('input');
      inputTag.type = 'file';
      inputTag.accept = accept;
      inputTag.multiple = multi;
      inputTag.click();
      inputTag.onchange = () => {
        if (inputTag.files) {
          resolve(inputTag.files);
        }
      };
    }) as Promise<FileList>;
  }
}
