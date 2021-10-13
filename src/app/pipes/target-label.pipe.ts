import { Pipe, PipeTransform } from '@angular/core';
import { ForecastTarget } from '../models/forecast-target';

@Pipe({
  name: 'targetLabel'
})
export class TargetLabelPipe implements PipeTransform {

  transform(value: ForecastTarget): string {
    switch (value) {
      case ForecastTarget.Cases:
        return 'Cases'
      case ForecastTarget.Death:
        return 'Deaths';
      case ForecastTarget.Hospitalisation:
        return 'Hospital';
      default:
        return 'Unknown Target';
    }
  }

}
