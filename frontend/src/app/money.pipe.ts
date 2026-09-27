import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(cents: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
      cents / 100,
    );
  }
}
