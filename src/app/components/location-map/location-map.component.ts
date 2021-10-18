import { Component, EventEmitter, Input, NgZone, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';
import { MapOptions } from 'leaflet';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { LocationLookupItem } from 'src/app/models/location-lookup';
import { FixedLinearThresholdColorScale, ThresholdColorScale } from 'src/app/models/threshold-color-scale';
import { GeoShapeServiceService } from 'src/app/services/geo-shape-service.service';
import { LocationLookupService } from 'src/app/services/location-lookup.service';
import * as _ from 'lodash-es';
import { NumberHelper } from 'src/app/util/number-helper';
import { ForecastTarget } from 'src/app/models/forecast-target';
import { color } from 'echarts';
import { environment } from 'src/environments/environment';
import { TargetLabelPipe } from 'src/app/pipes/target-label.pipe';

@Component({
  selector: 'app-location-map',
  templateUrl: './location-map.component.html',
  styleUrls: ['./location-map.component.scss']
})
export class LocationMapComponent implements OnInit, OnChanges {

  @Input() location: LocationLookupItem | null = null;
  @Output() onLocationChanged: EventEmitter<LocationLookupItem> = new EventEmitter<LocationLookupItem>();

  @Input() locationValues: Map<string, number> | null = null;
  @Input() colorScaleHeader: string | null = null;
  @Input() target: ForecastTarget | null = null;

  options: MapOptions = {
    zoomControl: false,
    doubleClickZoom: false,
    scrollWheelZoom: false,
    dragging: false,
    zoomSnap: 0.1,
    zoom: 2.8,
    center: { lng: 5, lat: 51 },
    layers: [],
  }

  private targetLabelPipe = new TargetLabelPipe();
  private selectedLocation$ = new BehaviorSubject<LocationLookupItem | null>(null);
  private locationValues$ = new BehaviorSubject<Map<string, number> | null>(null);
  private currentTarget$ = new BehaviorSubject<ForecastTarget | null>(null);
  mapContext$: Observable<any>;
  constructor(private geoService: GeoShapeServiceService, private locationLookupService: LocationLookupService, private zone: NgZone) {
    this.mapContext$ = combineLatest([this.geoService.euStates$, this.locationLookupService.locations$, this.selectedLocation$, this.locationValues$, this.currentTarget$])
      .pipe(debounceTime(50))
      .pipe(map(([euGeoJson, locationLu, currentLocation, locationValues, target]) => {
        if (!environment.production) {
          // check countries
          // locationValues.
          const itemsNotInGeoJson = locationLu.items.filter(x => !euGeoJson.features.some(f => this.getLookupIdByFeature(f) === x.id));
          if (itemsNotInGeoJson.length > 0) {
            console.warn("No features in geojson for", itemsNotInGeoJson);
          }
        }

        let colorScale = new FixedLinearThresholdColorScale();
        if (target && target === ForecastTarget.Death) {
          colorScale = new FixedLinearThresholdColorScale({
            values: [2.5, 5, 7.5, 10, 12.5], colors: ['#E2F4F1', '#B9E0E4', '#91BDD4', '#688DC5', '#433992', '#493271', '#422852',]
          });
        }

        const euLayer = L.geoJSON(euGeoJson, {
          style: (feature) => {
            const locationLookupId = this.getLookupIdByFeature(feature!);
            let fillcolor = 'gray';
            let isSelected = false;

            if (locationValues?.has(locationLookupId)) {
              const featureValue = locationValues.get(locationLookupId)!;
              const locationLookup = locationLu.get(locationLookupId);
              const featureIncidence = (featureValue / (locationLookup?.population || Infinity)) * 100000;
              isSelected = locationLookupId == currentLocation?.id;
              fillcolor = colorScale.getColor(featureIncidence);
            }

            return this.getStateStyle(isSelected, false, { fillColor: fillcolor });
          },
          onEachFeature: (feature, layer: L.GeoJSON) => {
            const locationLookupId = this.getLookupIdByFeature(feature!)
            const locationLookup = locationLu.get(locationLookupId);
            let isSelected = false;
            let fillcolor = 'grey';

            if (locationValues?.has(locationLookupId)) {
              const featureValue = locationValues.get(locationLookupId)!;
              const featureIncidence = (featureValue / (locationLookup?.population || Infinity)) * 100000;
              isSelected = locationLookupId == currentLocation?.id;
              fillcolor = colorScale.getColor(featureIncidence);

              layer.on('click', (x) => {
                const selected = locationLu.get(this.getLookupIdByFeature(x.target.feature));
                this.zone.run(() => { this.onLocationChanged.emit(selected); });
              });

              if (isSelected) {
                setTimeout(() => layer.bringToFront());
              }

              layer.bindTooltip(x => `<b>${locationLookup?.name || ''}</b><br/>${NumberHelper.formatDecimal(featureIncidence)} <i>/ 100,000 inhabitants</i> <br/>${NumberHelper.formatInt(featureValue)} <i>${this.targetLabelPipe.transform(target || ForecastTarget.Cases).toLowerCase()} last week</i>`);
            }

            layer.on('mouseover', x => {
              layer.setStyle(this.getStateStyle(isSelected, true, { fillColor: fillcolor }));
              setTimeout(() => layer.bringToFront());
              layer.bringToFront();
            });

            layer.on('mouseout', x => {
              layer.setStyle(this.getStateStyle(isSelected, false, { fillColor: fillcolor }))
              if (!isSelected) {
                setTimeout(() => layer.bringToBack());
                layer.bringToBack();
              }
            });
          }
        });
        return {
          layers: [euLayer],
          colorScale: colorScale
        };
      }));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.location) {
      this.selectedLocation$.next(this.location);
    }
    if (changes.locationValues) {
      this.locationValues$.next(this.locationValues);
    }
    if (changes.target) {
      this.currentTarget$.next(this.target);
    }
  }

  ngOnInit(): void {
  }

  onMapReady(map: L.Map) {
    // setTimeout(() => map.invalidateSize(), 250);
    // console.log("RDY", map.getBounds());
  }

  onMapResized(layer: L.GeoJSON) {
    // this.correctedFitBounds = layer ? layer.getBounds() : undefined;
  }

  private getStateStyle(isSelected: boolean, isHovered: boolean, style: Partial<L.PathOptions> = {}): L.PathOptions {
    return {
      color: isSelected ? 'rgb(101,179,46)' : (isHovered ? '#333' : '#4e555b'),
      weight: isSelected || isHovered ? 2 : 1,

      fillColor: 'transparent',
      fillOpacity: 0.9,

      ...style
    };
  }

  private getLookupIdByFeature(feature: GeoJSON.Feature): string {
    // if (feature.properties!.iso_a2 === "-99") return "FR";
    return feature.properties!.iso_a2;
  }
}
