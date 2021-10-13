import { BreakpointObserver } from '@angular/cdk/layout';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnInit, QueryList, ContentChildren, AfterViewInit, OnDestroy } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { shareReplay, map, startWith, delay } from 'rxjs/operators';
import { ForecastLayoutItemComponent } from '../forecast-layout-item/forecast-layout-item.component';

@Component({
  selector: 'app-forecast-layout',
  templateUrl: './forecast-layout.component.html',
  styleUrls: ['./forecast-layout.component.scss']
})
export class ForecastLayoutComponent implements OnInit, AfterViewInit, OnDestroy {

  endSideNavOpened = true;

  prevStartSideNavOpened: boolean = true;
  startSideNavOpened = true;

  prevIsDisplaySettingOpened: boolean = true;
  isDisplaySettingOpened = true;
  isSmallDisplaySettingsOpened = false;

  private displaySettingCloseSubscription: Subscription;
  private startSideNavCloseSubscription: Subscription;

  isDesktopWidth$: Observable<boolean>;
  isDisplaySettingHeight$: Observable<boolean>;
  isSmallWidth$: Observable<boolean>;

  @ContentChildren(ForecastLayoutItemComponent, { descendants: true }) items!: QueryList<ForecastLayoutItemComponent>;

  itemsSub?: Subscription;
  targetPortal$: BehaviorSubject<TemplatePortal | null> = new BehaviorSubject<TemplatePortal | null>(null);
  locationPortal$: BehaviorSubject<TemplatePortal | null> = new BehaviorSubject<TemplatePortal | null>(null);
  predictionIntervalPortal$: BehaviorSubject<TemplatePortal | null> = new BehaviorSubject<TemplatePortal | null>(null);
  displayModePortal$: BehaviorSubject<TemplatePortal | null> = new BehaviorSubject<TemplatePortal | null>(null);
  chartPortal$: BehaviorSubject<TemplatePortal | null> = new BehaviorSubject<TemplatePortal | null>(null);
  legendPortal$: BehaviorSubject<TemplatePortal | null> = new BehaviorSubject<TemplatePortal | null>(null);
  quickAccessPortal$: BehaviorSubject<TemplatePortal | null> = new BehaviorSubject<TemplatePortal | null>(null);
  headerPortal$: BehaviorSubject<TemplatePortal | null> = new BehaviorSubject<TemplatePortal | null>(null);
  yAxisPortal$: BehaviorSubject<TemplatePortal | null> = new BehaviorSubject<TemplatePortal | null>(null);

  constructor(private breakpointObserver: BreakpointObserver) {
    this.isDesktopWidth$ = this.breakpointObserver.observe('(min-width: 1400px)')
      .pipe(map(x => x.matches))
      .pipe(shareReplay(1));

    this.isSmallWidth$ = this.breakpointObserver.observe('(max-width: 990px)')
      .pipe(map(x => x.matches))
      .pipe(shareReplay(1));


    this.startSideNavCloseSubscription = this.isDesktopWidth$.subscribe(isDesktopWidth => {
      if (!isDesktopWidth) {
        this.prevStartSideNavOpened = this.startSideNavOpened;
        this.startSideNavOpened = false;
      }
      else {
        this.startSideNavOpened = this.prevStartSideNavOpened;
      }
    });

    this.isDisplaySettingHeight$ = this.breakpointObserver.observe('(min-height: 700px)').pipe(map(x => x.matches)).pipe(shareReplay(1));
    this.displaySettingCloseSubscription = this.isDisplaySettingHeight$.subscribe(isHeighEnoughForDisplaySettings => {
      if (!isHeighEnoughForDisplaySettings) {
        this.prevIsDisplaySettingOpened = this.isDisplaySettingOpened;
        this.isDisplaySettingOpened = false;
      } else {
        this.isDisplaySettingOpened = this.prevIsDisplaySettingOpened;
      }
    });
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    if (this.itemsSub) {
      this.itemsSub.unsubscribe();
    }
    this.startSideNavCloseSubscription.unsubscribe();
    this.displaySettingCloseSubscription.unsubscribe();
  }

  ngAfterViewInit(): void {
    const items$ = this.items.changes
      .pipe(startWith(this.items))
      .pipe(map((x: QueryList<ForecastLayoutItemComponent>) => x.toArray()))
      .pipe(delay(1));

    const portalsByPosition = new Map<string, BehaviorSubject<TemplatePortal | null>>([
      ['target', this.targetPortal$],
      ['location', this.locationPortal$],
      ['predictionInterval', this.predictionIntervalPortal$],
      ['displayMode', this.displayModePortal$],
      ['chart', this.chartPortal$],
      ['legend', this.legendPortal$],
      ['quickAccess', this.quickAccessPortal$],
      ['header', this.headerPortal$],
      ['yAxis', this.yAxisPortal$]
    ]);

    this.itemsSub = items$.subscribe(x => {
      x.forEach(p => {
        if (portalsByPosition.has(p.position)) {
          portalsByPosition.get(p.position)!.next(p.content);
        }
      });
      this.forceResize();
    });
  }

  closeStartSideNav() {
    this.startSideNavOpened = false;
  }

  openStartSideNav() {
    this.startSideNavOpened = true;
  }

  forceResize() {
    window.dispatchEvent(new Event('resize'));
  }

}


