declare module 'frappe-gantt' {
  export type GanttViewMode = 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month';

  export type GanttTask = {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
  };

  export type GanttOptions = {
    view_mode?: GanttViewMode;
    popup_trigger?: 'click' | 'hover';
    readonly?: boolean;
    custom_popup_html?: (task: GanttTask) => string;
    on_click?: (task: GanttTask) => void;
    on_date_change?: (task: GanttTask, start: string, end: string) => void;
    on_progress_change?: (task: GanttTask, progress: number) => void;
    on_view_change?: (mode: GanttViewMode) => void;
  };

  export default class Gantt {
    constructor(container: HTMLElement | string, tasks: GanttTask[], options?: GanttOptions);
    change_view_mode(mode: GanttViewMode): void;
  }
}
