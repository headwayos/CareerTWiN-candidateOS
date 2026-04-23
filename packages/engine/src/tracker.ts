import { 
  ApplicationTrackerItemSchema,
  type ApplicationTrackerItem,
  type ApplicationStatus
} from '@careertwin/schemas';
import fs from 'fs-extra';
import { WorkspaceManager } from './workspace';

export class TrackerEngine {
  private trackerPath: string;

  constructor(private workspace: WorkspaceManager) {
    this.trackerPath = workspace.getPath('tracker/applications.json');
  }

  async list(): Promise<ApplicationTrackerItem[]> {
    if (!(await fs.pathExists(this.trackerPath))) {
      return [];
    }
    const data = await fs.readJson(this.trackerPath);
    return Array.isArray(data) ? data : [];
  }

  async get(id: string): Promise<ApplicationTrackerItem | null> {
    const items = await this.list();
    return items.find(i => i.id === id) || null;
  }

  async add(item: ApplicationTrackerItem): Promise<void> {
    const validated = ApplicationTrackerItemSchema.parse(item);
    const items = await this.list();
    items.push(validated);
    await fs.writeJson(this.trackerPath, items, { spaces: 2 });
  }

  async update(id: string, status: ApplicationStatus): Promise<void> {
    const items = await this.list();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error(`Application ${id} not found`);
    
    items[idx].status = status;
    items[idx].lastUpdatedAt = new Date().toISOString();
    await fs.writeJson(this.trackerPath, items, { spaces: 2 });
  }

  async addNote(id: string, content: string): Promise<void> {
    const items = await this.list();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error(`Application ${id} not found`);

    items[idx].notes.push({
      date: new Date().toISOString(),
      content,
    });
    items[idx].lastUpdatedAt = new Date().toISOString();
    await fs.writeJson(this.trackerPath, items, { spaces: 2 });
  }

  async summary(): Promise<Record<string, number>> {
    const items = await this.list();
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return counts;
  }
}
