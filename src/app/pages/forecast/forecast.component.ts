import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, OnInit, ViewChild } from '@angular/core';
import { differenceInDays, isEqual } from 'date-fns';
import * as _ from 'lodash-es';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { shareReplay, debounceTime, map } from 'rxjs/operators';
import { ColorPicker } from 'src/app/models/color-picker';
import { ForecastDisplaySettings, ForecastDataFilter, ChartDataView, ForecastModelData, QuantileType, ForecastByHorizonDisplayMode, ForecastByDateDisplayMode, ForecastDisplayMode } from 'src/app/models/forecast-data';
import { ForecastTarget } from 'src/app/models/forecast-target';
import { LocationLookupItem } from 'src/app/models/location-lookup';
import { TargetLabelPipe } from 'src/app/pipes/target-label.pipe';
import { DefaultSettingsService } from 'src/app/services/default-settings.service';
import { ForecastDataSerivce } from 'src/app/services/forecast-data.service';
import { LocationLookupService } from 'src/app/services/location-lookup.service';
import { TruthDataService } from 'src/app/services/truth-data.service';

@Component({
  selector: 'app-forecast',
  templateUrl: './forecast.component.html',
  styleUrls: ['./forecast.component.scss']
})
export class ForecastRebuildComponent implements OnInit {
  ForecastTargetEnum = ForecastTarget;
  QuantileTypeEnum = QuantileType;

  private targetLabelPipe = new TargetLabelPipe();
  private userVisibleModels$ = new BehaviorSubject<string[] | undefined>(undefined);
  private displaySettings: ForecastDisplaySettings;
  private dataFilter: ForecastDataFilter;

  dataView$: Observable<ChartDataView>;
  locationsOrderedById$: Observable<LocationLookupItem[]>;
  locations$: Observable<LocationLookupItem[]>;
  locationValueMap$: Observable<Map<string, number>>;
  visibleModels$: Observable<string[]>;
  allModelNames$: Observable<string[]>;
  ensembleModelNames$: Observable<string[]>;
  mapLegendHeader$: Observable<string>;
  colorPicker = new ColorPicker();

  constructor(private forecastService: ForecastDataSerivce, public locationService: LocationLookupService, private truthDataService: TruthDataService, private defaultSettingService: DefaultSettingsService) {
    this.ensembleModelNames$ = this.defaultSettingService.ensembleModelNames$;

    this.dataFilter = new ForecastDataFilter(this.locationService);
    this.locationsOrderedById$ = this.locationService.locations$.pipe(map(x => _.orderBy(x.items, 'id')));
    this.locations$ = this.locationService.locations$.pipe(map(x => x.items));

    const truthDataView$ = combineLatest([this.truthDataService.truthData$, this.dataFilter.filter$])
      .pipe(map(([truthData, filter]) => {
        const data = truthData[filter.location.id][filter.target];
        return {
          filter: filter,
          truthData: data
        };
      }))
      .pipe(shareReplay(1));

    const forecastDataView$ = this.forecastService.createForecastDataObservable(this.dataFilter).pipe(shareReplay(1));

    this.locationValueMap$ = combineLatest([this.truthDataService.truthData$, this.dataFilter.target$])
      .pipe(map(([data, target]) => {
        return new Map<string, number>(_.map(data, (d, locationKey) => {
          const maxDateItem = _.maxBy(d[target], x => x.date);
          return [locationKey, maxDateItem ? maxDateItem.value : 0];
        }));
      }))
      .pipe(shareReplay(1));

    this.displaySettings = new ForecastDisplaySettings(forecastDataView$.pipe(map(x => x.availableForecastDates)).pipe(shareReplay(1)));

    const forecastModelsDataView$ = combineLatest([forecastDataView$, this.displaySettings.settings$])
      .pipe(map(([dataView, displaySettings]) => {
        const modelMap = _.reduce(dataView.data, (prev, curr) => {
          if (!prev.has(curr.model)) {
            prev.set(curr.model, { model: curr.model, color: this.colorPicker.pick(curr.model), data: [] });
          }

          const modelSeries = prev.get(curr.model)!;

          if (displaySettings.displayMode.$type === 'ForecastByDateDisplayMode') {
            if (curr.timezero.toISOString() === displaySettings.displayMode.forecastDate.toISOString() && curr.target.time_ahead <= displaySettings.displayMode.weeksShown) {
              modelSeries.data.push(curr);
            }
          }
          else if (displaySettings.displayMode.$type === 'ForecastByHorizonDisplayMode') {
            if (curr.target.time_ahead <= displaySettings.displayMode.weeksAhead) {
              modelSeries.data.push(curr);
            }
          }

          return prev;
        }, new Map<string, ForecastModelData>());
        return {
          displaySettings,
          availableDates: dataView.availableForecastDates,
          data: _.orderBy([...modelMap.values()], x => x.model)
        }
      }))
      .pipe(shareReplay(1));

    this.allModelNames$ = forecastModelsDataView$.pipe(map(x => x.data.map(d => d.model)));

    this.visibleModels$ = combineLatest([this.userVisibleModels$.asObservable(), this.defaultSettingService.defaultModelNames$, this.allModelNames$]).pipe(map(([u, d, a]) => {
      return u || d || a;
    }));

    this.dataView$ = combineLatest([forecastModelsDataView$, truthDataView$])
      .pipe(debounceTime(50))
      .pipe(map(([forecastModelsDataView, truthData]) => {
        return {
          displaySettings: forecastModelsDataView.displaySettings,
          forecasts: forecastModelsDataView.data,
          truthData: truthData.truthData,
          filter: truthData.filter,
          availableDates: forecastModelsDataView.availableDates
        };
      }))
      .pipe(shareReplay(1));

    this.mapLegendHeader$ = this.dataFilter.target$
      .pipe(map(x => {
        return `<b>${this.targetLabelPipe.transform(x)}</b><i> / 100,000 inhabitants</i>`;
      }));
  }

  ngOnInit(): void {
  }

  changeTarget(target: ForecastTarget) {
    this.dataFilter.changeTarget(target);
  }

  changeLocation(location: LocationLookupItem | undefined) {
    this.dataFilter.changeLocation(location);
  }

  compareDates(l: Date, r: Date) {
    return l.toISOString() === r.toISOString();
  }

  changeConfidenceInterval(ci: QuantileType | undefined) {
    this.displaySettings.changeConfidenceInterval(ci);
  }

  changeYScale(value: 'linear' | 'log') {
    this.displaySettings.changeYScale(value);
  }

  changeYValue(value: 'count' | 'incidence') {
    this.displaySettings.changeYValue(value);
  }

  changeDisplayMode(type: 'ForecastByDateDisplayMode' | 'ForecastByHorizonDisplayMode') {
    const newMode = type === 'ForecastByHorizonDisplayMode' ? 'horizon' : 'date';
    this.displaySettings.changeDisplayMode(newMode);
  }

  changeHorizonWeeksAhead(update: 1 | 2 | 3 | 4, currentDisplayMode: ForecastByHorizonDisplayMode) {
    this.displaySettings.changeHorizonDisplayMode({ ...currentDisplayMode, weeksAhead: update });
  }

  changeDateWeeksShown(update: 1 | 2 | 3 | 4, currentDisplayMode: ForecastByDateDisplayMode) {
    this.displaySettings.changeDateDisplayMode({ ...currentDisplayMode, weeksShown: update });
  }

  canExecPrev(currentDisplaMode: ForecastDisplayMode, availableDates: Date[]) {
    return currentDisplaMode.$type === 'ForecastByDateDisplayMode' && this.getAvailableDateByDir('prev', currentDisplaMode, availableDates) !== undefined;
  }

  canExecNext(currentDisplaMode: ForecastDisplayMode, availableDates: Date[]) {
    return currentDisplaMode.$type === 'ForecastByDateDisplayMode' && this.getAvailableDateByDir('next', currentDisplaMode, availableDates) !== undefined;
  }

  private getAvailableDateByDir(dir: 'prev' | 'next', currentDisplaMode: ForecastDisplayMode, availableDates: Date[]): Date | undefined {
    if (currentDisplaMode.$type === 'ForecastByDateDisplayMode') {
      const searchDate = currentDisplaMode.forecastDate;
      const foundIndex = _.findIndex(availableDates, d => isEqual(d, searchDate));
      if (foundIndex !== -1) {
        const newDateIndex = dir === 'next' ? foundIndex - 1 : foundIndex + 1;
        if (newDateIndex >= 0 && newDateIndex < availableDates.length) {
          return availableDates[newDateIndex];
        }
      }
    }

    return undefined;
  }

  changeForecastDateByDir(dir: 'prev' | 'next', currentDisplaMode: ForecastDisplayMode, availableDates: Date[]) {
    const newDate = this.getAvailableDateByDir(dir, currentDisplaMode, availableDates);
    if (newDate) {
      this.changeForecastDate(newDate, availableDates, currentDisplaMode);
    }
  }

  changeForecastDate(date: Date, dates: Date[], currentDisplayMode: ForecastDisplayMode) {
    if (currentDisplayMode && currentDisplayMode.$type === 'ForecastByDateDisplayMode' && dates) {
      const closestDate = _.minBy(dates, x => Math.abs(differenceInDays(x, date)));
      if (closestDate && Math.abs(differenceInDays(closestDate, date)) <= 7) {
        const newMode = { ...currentDisplayMode, forecastDate: closestDate };
        this.displaySettings.changeDateDisplayMode(newMode);
      }
    }
  }

  changeVisibleModels(visibleModels: string[]) {
    this.userVisibleModels$.next(visibleModels);
  }

  @ViewChild(CdkScrollable) scroller?: CdkScrollable;

  scrollDown() {
    if (this.scroller) {
      const currentTop = this.scroller.measureScrollOffset('top');
      const newTop = currentTop + 42;
      this.scroller.scrollTo({ behavior: 'smooth', top: newTop });
    }
  }

  scrollUp() {
    if (this.scroller) {
      const currentTop = this.scroller.measureScrollOffset('top');
      const newTop = currentTop - 42;
      this.scroller.scrollTo({ behavior: 'smooth', top: newTop });
    }
  }
}
