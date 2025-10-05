// frontend/lib/kiosk/widgetIntelligence.ts
// Intelligent widget ordering and prioritization for kiosk display

import { KioskWidget } from '@/types/kiosk';

export interface WidgetPriority {
  widget: KioskWidget;
  score: number;
  reasons: string[];
}

/**
 * Calculate priority score for a widget based on data and context
 */
export function calculateWidgetPriority(
  widget: KioskWidget,
  data: any,
  currentTime: Date = new Date()
): WidgetPriority {
  let score = widget.order || 0; // Start with configured order
  const reasons: string[] = [];

  // Calculate day of month once (needed for multiple cases)
  const dayOfMonth = currentTime.getDate();

  // Priority factors based on widget type and data
  switch (widget.component) {
    case 'AssemblyWidget':
      // High priority if assembly is soon
      if (data?.announcements?.some((a: any) =>
        a.title?.includes('Συνέλευση') || a.title?.includes('Σύγκληση')
      )) {
        // Check if assembly date is within next 7 days
        const assemblyAnn = data.announcements.find((a: any) =>
          a.title?.includes('Συνέλευση') || a.title?.includes('Σύγκληση')
        );
        if (assemblyAnn?.start_date) {
          const daysUntil = Math.ceil(
            (new Date(assemblyAnn.start_date).getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntil <= 7 && daysUntil >= 0) {
            score += 100; // Very high priority for upcoming assembly
            reasons.push(`Συνέλευση σε ${daysUntil} ημέρες`);
          } else if (daysUntil <= 14 && daysUntil >= 0) {
            score += 50;
            reasons.push(`Συνέλευση σε ${daysUntil} ημέρες`);
          }
        }
      }
      break;

    case 'AnnouncementsWidget':
      // Higher priority if there are high-priority announcements
      const highPriorityCount = data?.announcements?.filter((a: any) =>
        a.priority === 'high'
      ).length || 0;
      if (highPriorityCount > 0) {
        score += highPriorityCount * 20;
        reasons.push(`${highPriorityCount} επείγουσες ανακοινώσεις`);
      }

      // Higher priority for recent announcements (within last 2 days)
      const recentCount = data?.announcements?.filter((a: any) => {
        const announcementDate = new Date(a.created_at);
        const daysSince = (currentTime.getTime() - announcementDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 2;
      }).length || 0;
      if (recentCount > 0) {
        score += recentCount * 10;
        reasons.push(`${recentCount} πρόσφατες ανακοινώσεις`);
      }
      break;

    case 'VotesWidget':
      // High priority if there are active votes
      const activeVotes = data?.votes?.filter((v: any) =>
        new Date(v.end_date) > currentTime
      ).length || 0;
      if (activeVotes > 0) {
        score += activeVotes * 30;
        reasons.push(`${activeVotes} ενεργές ψηφοφορίες`);
      }

      // Extra priority if votes are ending soon (within 3 days)
      const urgentVotes = data?.votes?.filter((v: any) => {
        const endDate = new Date(v.end_date);
        const daysUntil = (endDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntil <= 3 && daysUntil > 0;
      }).length || 0;
      if (urgentVotes > 0) {
        score += urgentVotes * 40;
        reasons.push(`${urgentVotes} ψηφοφορίες λήγουν σύντομα`);
      }
      break;

    case 'FinancialWidget':
      // Higher priority if collection rate is low
      const collectionRate = data?.financial?.collection_rate || 100;
      if (collectionRate < 70) {
        score += 50;
        reasons.push('Χαμηλή εισπραξιμότητα');
      } else if (collectionRate < 85) {
        score += 25;
        reasons.push('Μέτρια εισπραξιμότητα');
      }

      // Higher priority early in the month (common expense payment period)
      const dayOfMonth = currentTime.getDate();
      if (dayOfMonth <= 10) {
        score += 30;
        reasons.push('Περίοδος πληρωμής κοινοχρήστων');
      }
      break;

    case 'MaintenanceWidget':
      // Higher priority if there are urgent tasks
      const urgentTasks = data?.maintenance?.active_tasks?.filter((t: any) =>
        t.priority === 'high'
      ).length || 0;
      if (urgentTasks > 0) {
        score += urgentTasks * 25;
        reasons.push(`${urgentTasks} επείγουσες εργασίες`);
      }

      // Higher priority if there are many active tasks
      const activeTasks = data?.maintenance?.active_tasks?.length || 0;
      if (activeTasks >= 5) {
        score += 20;
        reasons.push(`${activeTasks} ενεργές εργασίες`);
      }
      break;

    case 'CommonExpenseBillWidget':
      // Very high priority in first 2 weeks of month
      if (dayOfMonth <= 14) {
        score += 60;
        reasons.push('Περίοδος έκδοσης φύλλου κοινοχρήστων');
      }
      break;

    default:
      // Default ordering based on settings
      break;
  }

  return {
    widget,
    score,
    reasons
  };
}

/**
 * Sort widgets by priority score (highest first)
 */
export function sortWidgetsByPriority(
  widgets: KioskWidget[],
  data: any,
  currentTime: Date = new Date()
): WidgetPriority[] {
  const priorities = widgets.map(widget =>
    calculateWidgetPriority(widget, data, currentTime)
  );

  return priorities.sort((a, b) => b.score - a.score);
}

/**
 * Get recommended widget order for slides
 */
export function getIntelligentWidgetOrder(
  widgets: KioskWidget[],
  data: any,
  category: 'main_slides' | 'sidebar_widgets' | 'top_bar_widgets' | 'special_widgets' = 'main_slides'
): KioskWidget[] {
  const categoryWidgets = widgets.filter(w => w.category === category);
  const sortedPriorities = sortWidgetsByPriority(categoryWidgets, data);

  // Return sorted widgets
  return sortedPriorities.map(p => p.widget);
}

/**
 * Determine if a widget should be shown based on data availability and importance
 */
export function shouldShowWidget(
  widget: KioskWidget,
  data: any,
  minPriorityScore: number = 0
): boolean {
  const priority = calculateWidgetPriority(widget, data);
  return priority.score >= minPriorityScore;
}

/**
 * Get widget display duration based on priority
 * Higher priority widgets get more display time
 */
export function getWidgetDisplayDuration(
  widget: KioskWidget,
  data: any,
  baseDuration: number = 8000 // 8 seconds default
): number {
  const priority = calculateWidgetPriority(widget, data);

  // Adjust duration based on priority score
  if (priority.score >= 100) {
    return baseDuration * 1.5; // 12 seconds for high priority
  } else if (priority.score >= 50) {
    return baseDuration * 1.25; // 10 seconds for medium-high priority
  } else if (priority.score <= -50) {
    return baseDuration * 0.75; // 6 seconds for low priority
  }

  return baseDuration;
}
