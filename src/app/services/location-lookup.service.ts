import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, shareReplay } from 'rxjs/operators';
import * as _ from 'lodash-es';
import * as Papa from 'papaparse';
import { Observable } from 'rxjs';
import { LocationLookup } from '../models/location-lookup';
import { environment } from './../../environments/environment';

interface RawLocationRow {
  location: string;
  location_name: string;
  population: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationLookupService {
  // private readonly locationUrl = 'https://raw.githubusercontent.com/jbracher/covid19-forecast-hub-europe/main/viz/location_codes.csv';

  locations$: Observable<LocationLookup>;

  constructor(private http: HttpClient) {
    this.locations$ = this.http.get(environment.urls.lookups.location, { responseType: 'text' })
      .pipe(map(x => {
        const parsed = Papa.parse<RawLocationRow>(x, { header: true, skipEmptyLines: true });
        return new LocationLookup(_.map(parsed.data, d => ({ id: d.location, name: d.location_name, population: parseInt(d.population) })));
      }))
      .pipe(shareReplay(1));
  }
}
