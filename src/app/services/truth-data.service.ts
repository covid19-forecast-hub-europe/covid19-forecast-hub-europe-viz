import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TruthData } from '../models/truth-data';
import * as Papa from 'papaparse';
import { map, shareReplay } from 'rxjs/operators';
import * as _ from 'lodash-es';
import { ForecastTarget } from '../models/forecast-target';
import { environment } from './../../environments/environment';

interface RawTruthToPlot {
  date: string;
  location: string;
  inc_case: string;
  inc_death: string;
}

@Injectable({
  providedIn: 'root'
})
export class TruthDataService {

  // private readonly url = 'https://raw.githubusercontent.com/jbracher/covid19-forecast-hub-europe/main/viz/truth_to_plot.csv';

  truthData$: Observable<{ [locationId: string]: { [target: string]: TruthData[] } }>

  constructor(private http: HttpClient) {
    this.truthData$ = this.http.get(environment.urls.truthData, { responseType: 'text' })
      .pipe(map(data => {
        const parseResult = Papa.parse<RawTruthToPlot>(data, { header: true, skipEmptyLines: true });
        return _.fromPairs(_.map(_.groupBy(parseResult.data, x => x.location), (locGroup, locKey) => {
          return [locKey, {
            'cases': locGroup.map(x => ({ date: new Date(x.date), value: parseInt(x.inc_case) })),
            'death': locGroup.map(x => ({ date: new Date(x.date), value: parseInt(x.inc_death) })),
            // Todo: add 'hosp' mapping for truthData here
          }]
        }));
      }))
      .pipe(shareReplay(1));
  }
}
