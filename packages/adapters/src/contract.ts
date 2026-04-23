import { 
  type CandidateProfile, 
  type EvaluationRun, 
  type ApplicationTrackerItem,
  type Passport,
  type LocalConfig
} from '@careertwin/schemas';

export interface HealthReport {
  node: string;
  config: boolean;
  latex: boolean;
  filesystem: boolean;
}

export interface AssistantAdapter {
  init(): Promise<void>;
  doctor(): Promise<HealthReport>;
  profile: {
    show(): Promise<CandidateProfile | null>;
    ingest(text: string): Promise<void>;
    importCV(filePath: string): Promise<void>;
  };
  evaluate(jobSource: string): Promise<any>;
  tailor(jobId: string): Promise<any>;
  resume: {
    build(mode: 'ats' | 'startup', jobId?: string): Promise<any>;
  };
  passport: {
    build(): Promise<any>;
    publish(): Promise<any>;
    unpublish(): Promise<void>;
  };
  tracker: {
    list(): Promise<ApplicationTrackerItem[]>;
    get(id: string): Promise<ApplicationTrackerItem | null>;
    update(id: string, status: string): Promise<void>;
  };
  artifact: {
    inspect(id: string): Promise<string>;
    list(): Promise<any[]>;
  };
}
