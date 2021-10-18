import { APP_BASE_HREF } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GeoShapeServiceService {

  private readonly euStatesUrl = 'assets/eu-countries.json';
  euStates$: Observable<GeoJSON.FeatureCollection>;

  constructor(private http: HttpClient, @Inject(APP_BASE_HREF) private baseHref: string) {
    this.euStates$ = this.http.get<GeoJSON.FeatureCollection>(this.baseHref + this.euStatesUrl).pipe(shareReplay(1));
  }
}
