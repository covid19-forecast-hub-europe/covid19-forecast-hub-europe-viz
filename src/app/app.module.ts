import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LocationMapComponent } from './components/location-map/location-map.component';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgxEchartsModule } from 'ngx-echarts';
import { FormsModule } from '@angular/forms';
import { ForecastChartComponent } from './components/forecast-chart/forecast-chart.component';
import { LeafletExtentionDirective } from './directives/leaflet-extention.directive';
import { EchartsZrClickDirective } from './directives/echarts-zr-click.directive';
import { HoverClassDirective } from './directives/hover-class.directive';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ForecastDataSerivce } from './services/forecast-data.service';
import { ForecastCsvDataService } from './services/forecast-csv-data.service';
import { ForecastJsonDataService } from './services/forecast-json-data.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LayoutModule } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { CdkScrollableModule } from '@angular/cdk/scrolling'
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { PortalModule } from '@angular/cdk/portal';
import { MatSortModule } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { LegendComponent } from './components/legend/legend.component';
import { DateToPrevSaturdayPipe } from './pipes/date-to-prev-saturday.pipe';
import { CdkScrollableExtDirective } from './directives/cdk-scrollable-ext.directive';
import { TargetLabelPipe } from './pipes/target-label.pipe';
import { ForecastLayoutComponent } from './components/forecast-layout/forecast-layout.component';
import { ForecastLayoutItemComponent } from './components/forecast-layout-item/forecast-layout-item.component';
import { ForecastRebuildComponent } from './pages/forecast/forecast.component';
import { APP_BASE_HREF, PlatformLocation } from '@angular/common';

@NgModule({
  declarations: [
    AppComponent,
    LocationMapComponent,
    ForecastChartComponent,
    LeafletExtentionDirective,
    EchartsZrClickDirective,
    HoverClassDirective,
    LoadingSpinnerComponent,
    LegendComponent,
    DateToPrevSaturdayPipe,
    CdkScrollableExtDirective,
    TargetLabelPipe,
    ForecastLayoutComponent,
    ForecastLayoutItemComponent,
    ForecastRebuildComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    LeafletModule,
    FontAwesomeModule,
    PortalModule,
    NgxEchartsModule.forRoot({
      /**
       * This will import all modules from echarts.
       * If you only need custom modules,
       * please refer to [Custom Build] section.
       */
      echarts: () => import('echarts'), // or import('./path-to-my-custom-echarts')
    }),
    BrowserAnimationsModule,
    LayoutModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatCardModule,
    MatGridListModule,
    MatMenuModule,
    MatButtonToggleModule,
    MatSelectModule,
    CdkScrollableModule,
    MatTabsModule,
    MatExpansionModule,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule
  ],
  providers: [
    // { provide: ForecastDataSerivce, useClass: ForecastCsvDataService },
    { provide: ForecastDataSerivce, useClass: ForecastJsonDataService },
    {
      provide: APP_BASE_HREF,
      useFactory: (s: PlatformLocation) => s.getBaseHrefFromDOM(),
      deps: [PlatformLocation]
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
