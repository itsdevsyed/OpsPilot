export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown';
export type IncidentStatus = 'open' | 'investigating' | 'mitigated' | 'resolved' | 'closed';

export interface Incident {
  id: number;
  type: string;
  service: string;
  severity: SeverityLevel;
  problem: string | null;
  root_cause: string | null;
  suggested_fix: string | null;
  evidence: string[];
  commands: string[];
  occurrences: number;
  status: IncidentStatus;
  first_seen: string | null;
  last_seen: string | null;
}

export interface CommandExecution {
  id: string;
  timestamp: string;
  command: string;
  target: string;
  status: 'success' | 'running' | 'failed';
  triggeredBy: 'auto-policy' | 'manual-approval' | 'operator';
  output?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
}
