import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatDividerModule,
    MatExpansionModule,
  ],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss'],
  animations: [
    trigger('slideInOut', [
      state('in', style({ transform: 'translateX(0%)' })),
      state('out', style({ transform: 'translateX(-100%)' })),
      transition('in <=> out', animate('300ms ease-in-out')),
    ])
  ]
})
export class SidebarComponent {
  @Input() isSidebarOpen = true;
  @Output() closeSidebar = new EventEmitter<void>();

  onMenuClick() {
    this.closeSidebar.emit();
  }

  menu = {
    name: 'EXAMPLE',
    heads: [
      {
        label: 'Theme',
        expandable: false,
        details: [
          { label: 'Colors', icon: 'palette', link: '/theme/colors' },
          { label: 'Typography', icon: 'text_fields', link: '/theme/typography' }
        ]
      },
      {
        label: 'Components',
        expandable: true,
        details: [
          { label: 'Accordion', icon: 'unfold_more', link: '/components/accordion' },
          { label: 'Breadcrumb', icon: 'linear_scale', link: '/components/breadcrumb' }
        ]
      }
    ]
  };

}
