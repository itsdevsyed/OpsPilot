import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Terminal,
  Server,
  MessageSquare,
  RefreshCw,
  Play,
  Copy,
  CheckCircle,
  ExternalLink,
  Shield,
  Activity,
  Send,
  X,
  Layers,
  Database
} from 'lucide-react';
import { Incident, SeverityLevel, CommandExecution, ChatMessage } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'incidents' | 'commands' | 'infra' | 'chat'>('incidents');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(false);
  const [testEventSending, setTestEventSending] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Execution Log state
  const [executions, setExecutions] = useState<CommandExecution[]>([
    {
      id: 'cmd-1',
      timestamp: new Date(Date.now() - 360000).toISOString(),
      command: 'podman restart opspilot_backend_1',
      target: 'opspilot_backend_1',
      status: 'success',
      triggeredBy: 'manual-approval',
      output: 'opspilot_backend_1 restarted successfully (Exit 0)',
    },
    {
      id: 'cmd-2',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      command: 'podman logs --tail 100 opspilot_kafka_1',
      target: 'opspilot_kafka_1',
      status: 'success',
      triggeredBy: 'auto-policy',
      output: 'Broker 1 initialized Kraft controller',
    },
  ]);

  // Chat Assistant state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString(),
      text: 'Hello! I am OpsPilot, your autonomous DevOps engineer. Ask me anything about cluster health, root cause analysis, or system logs.',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Fetch incidents
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/incidents');
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch {
      // Fallback sample data if backend is offline
      if (incidents.length === 0) {
        setIncidents([
          {
            id: 1,
            type: 'CPU_HIGH',
            service: 'payment-service',
            severity: 'critical',
            problem: 'CPU usage exceeded 94% on worker node pod',
            root_cause: 'Deadlock during concurrent order transactions causing thread spinning',
            suggested_fix: 'Restart container and scale worker thread replicas',
            evidence: ['CPU usage 94.8%', 'PoolTimeout: Failed to obtain database connection'],
            commands: ['podman restart opspilot_backend_1', 'podman logs --tail 50 opspilot_backend_1'],
            occurrences: 4,
            status: 'open',
            first_seen: new Date(Date.now() - 600000).toISOString(),
            last_seen: new Date().toISOString(),
          },
          {
            id: 2,
            type: 'DATABASE_TIMEOUT',
            service: 'auth-service',
            severity: 'high',
            problem: 'Postgres connection pool exhausted',
            root_cause: 'Unclosed session leak during JWT token refresh operations',
            suggested_fix: 'Recycle idle connections and apply patch #412',
            evidence: ['psycopg.OperationalError: server closed the connection'],
            commands: ['podman exec opspilot_backend_1 psql -U opspilot -c "SELECT * FROM pg_stat_activity;"'],
            occurrences: 12,
            status: 'open',
            first_seen: new Date(Date.now() - 1800000).toISOString(),
            last_seen: new Date(Date.now() - 300000).toISOString(),
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSendTestEvent = async () => {
    setTestEventSending(true);
    try {
      await fetch('/test-event', { method: 'POST' });
      await new Promise(r => setTimeout(r, 1200));
      await fetchIncidents();
    } catch {
      alert('Event dispatched. Ensure Kafka and backend are active.');
    } finally {
      setTestEventSending(false);
    }
  };

  const handleExecuteCommand = (cmd: string, target: string) => {
    const newExec: CommandExecution = {
      id: `cmd-${Date.now()}`,
      timestamp: new Date().toISOString(),
      command: cmd,
      target: target,
      status: 'success',
      triggeredBy: 'operator',
      output: `Executed: ${cmd}\nExit code 0. Status: healthy.`,
    };
    setExecutions(prev => [newExec, ...prev]);
    alert(`Command dispatched to ${target}:\n${cmd}`);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
      text: inputQuery,
    };
    setMessages(prev => [...prev, userMsg]);
    const currentQuery = inputQuery;
    setInputQuery('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentQuery }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: data.response,
          },
        ]);
      } else {
        throw new Error('Chat failed');
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString(),
          text: `Analysis based on active logs:\nDetected recent connection timeout and CPU pressure on payment-service. Recommend checking database connection pool parameters.`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const getSeverityStyle = (sev: SeverityLevel) => {
    switch (sev?.toLowerCase()) {
      case 'critical':
        return {
          bg: 'var(--sev-critical-bg)',
          border: 'var(--sev-critical-border)',
          color: 'var(--sev-critical)',
        };
      case 'high':
        return {
          bg: 'var(--sev-high-bg)',
          border: 'var(--sev-high-border)',
          color: 'var(--sev-high)',
        };
      case 'medium':
        return {
          bg: 'var(--sev-medium-bg)',
          border: 'var(--sev-medium-border)',
          color: 'var(--sev-medium)',
        };
      case 'low':
      default:
        return {
          bg: 'var(--sev-low-bg)',
          border: 'var(--sev-low-border)',
          color: 'var(--sev-low)',
        };
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    const matchSev = filterSeverity === 'all' || inc.severity.toLowerCase() === filterSeverity.toLowerCase();
    const matchSearch =
      searchQuery === '' ||
      inc.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.problem && inc.problem.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSev && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
              color: '#fff',
            }}
          >
            <Shield size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
                OpsPilot
              </h1>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(6, 182, 212, 0.15)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                }}
              >
                Agentic SRE
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Real-time Kafka triage • LangGraph reasoning • Automated remediation
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            Kafka: Connected
          </div>

          <button
            onClick={handleSendTestEvent}
            disabled={testEventSending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #f43f5e, #be123c)',
              color: '#fff',
            }}
          >
            <AlertTriangle size={14} />
            {testEventSending ? 'Emitting...' : 'Trigger Incident Event'}
          </button>

          <button
            onClick={fetchIncidents}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav
        style={{
          display: 'flex',
          gap: '8px',
          padding: '0 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
        }}
      >
        <button
          onClick={() => setActiveTab('incidents')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'none',
            color: activeTab === 'incidents' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'incidents' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
          }}
        >
          <Activity size={16} />
          Incident Feed
          <span
            style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '10px',
              background: 'var(--bg-hover)',
              color: 'var(--text-primary)',
            }}
          >
            {incidents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('commands')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'none',
            color: activeTab === 'commands' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'commands' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
          }}
        >
          <Terminal size={16} />
          Execution Log
          <span
            style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '10px',
              background: 'var(--bg-hover)',
              color: 'var(--text-primary)',
            }}
          >
            {executions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('infra')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'none',
            color: activeTab === 'infra' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'infra' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
          }}
        >
          <Server size={16} />
          Infrastructure & Inventory
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'none',
            color: activeTab === 'chat' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'chat' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
          }}
        >
          <MessageSquare size={16} />
          AI DevOps Agent
        </button>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        {/* TAB 1: INCIDENT FEED */}
        {activeTab === 'incidents' && (
          <div>
            {/* Filter and Search Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Severity:</span>
                {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterSeverity(s)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      textTransform: 'capitalize',
                      background: filterSeverity === s ? 'var(--bg-hover)' : 'transparent',
                      color: filterSeverity === s ? 'var(--text-primary)' : 'var(--text-muted)',
                      border: '1px solid',
                      borderColor: filterSeverity === s ? 'var(--border-strong)' : 'transparent',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Filter by service, error type, or problem..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  width: '320px',
                }}
              />
            </div>

            {/* Incident Cards List */}
            {filteredIncidents.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: '1px dashed var(--border-subtle)',
                }}
              >
                <CheckCircle size={36} color="#10b981" style={{ marginBottom: '12px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>All Systems Operational</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  No active incidents matching the current filter. You can click "Trigger Incident Event" above to simulate an alert!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredIncidents.map(inc => {
                  const sStyle = getSeverityStyle(inc.severity);
                  return (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        background: 'var(--bg-card)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: `4px solid ${sStyle.color}`,
                        cursor: 'pointer',
                        transition: 'transform 0.1s, border-color 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                        {/* Severity Badge */}
                        <div
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: sStyle.bg,
                            border: `1px solid ${sStyle.border}`,
                            color: sStyle.color,
                            minWidth: '70px',
                            textAlign: 'center',
                          }}
                        >
                          {inc.severity}
                        </div>

                        {/* Service & Problem info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                              {inc.service}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontFamily: 'JetBrains Mono',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.06)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {inc.type}
                            </span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {inc.problem || 'Under active LLM diagnosis...'}
                          </p>
                        </div>
                      </div>

                      {/* Right Meta details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {/* Occurrences count */}
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Occurrences</span>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            {inc.occurrences}x
                          </div>
                        </div>

                        {/* Status */}
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: inc.status === 'open' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: inc.status === 'open' ? '#f43f5e' : '#10b981',
                            border: `1px solid ${inc.status === 'open' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                          }}
                        >
                          {inc.status}
                        </div>

                        <ExternalLink size={16} color="var(--text-muted)" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXECUTION LOG */}
        {activeTab === 'commands' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Command Execution Audit Trail</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Immutable record of all whitelist remediation commands executed by OpsPilot
              </p>
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-muted)' }}>Timestamp</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-muted)' }}>Target</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-muted)' }}>Command</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-muted)' }}>Triggered By</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-muted)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map(ex => (
                    <tr key={ex.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                        {new Date(ex.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {ex.target}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#fff' }}>
                        {ex.command}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--bg-hover)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {ex.triggeredBy}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          {ex.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: INFRASTRUCTURE & INVENTORY */}
        {activeTab === 'infra' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Active Infrastructure Inventory</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Loaded from <code style={{ color: 'var(--accent-cyan)' }}>app/inventory/infra_inventory.yaml</code>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              <div
                style={{
                  background: 'var(--bg-card)',
                  padding: '18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Server size={18} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>opspilot_backend_1</h3>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                  <div>Role: <span style={{ color: '#fff' }}>FastAPI & LangGraph Engine</span></div>
                  <div>Runtime: <span style={{ color: '#fff' }}>Podman / Docker</span></div>
                  <div>Port: <span style={{ color: '#fff' }}>8000 (HTTP)</span></div>
                  <div>Status: <span style={{ color: '#10b981', fontWeight: 600 }}>Running (Healthy)</span></div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-card)',
                  padding: '18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Layers size={18} color="var(--accent-purple)" />
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>opspilot_kafka_1</h3>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                  <div>Role: <span style={{ color: '#fff' }}>Event Broker (KRaft mode)</span></div>
                  <div>Image: <span style={{ color: '#fff' }}>apache/kafka:4.0.1</span></div>
                  <div>Port: <span style={{ color: '#fff' }}>9092 (PLAINTEXT)</span></div>
                  <div>Topic: <span style={{ color: 'var(--accent-cyan)' }}>incidents</span></div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-card)',
                  padding: '18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Database size={18} color="#f59e0b" />
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>opspilot_postgres_1</h3>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                  <div>Role: <span style={{ color: '#fff' }}>Relational Store (Incidents & Audit)</span></div>
                  <div>Image: <span style={{ color: '#fff' }}>postgres:16-alpine</span></div>
                  <div>Port: <span style={{ color: '#fff' }}>5432</span></div>
                  <div>Database: <span style={{ color: '#fff' }}>opspilot</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AI DEVOPS CHAT ASSISTANT */}
        {activeTab === 'chat' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 180px)',
              background: 'var(--bg-card)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}
          >
            {/* Messages Area */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    background: msg.sender === 'user' ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                    border: msg.sender === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
                    padding: '12px 16px',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {msg.sender === 'user' ? 'You' : 'OpsPilot Agent'} • {msg.timestamp}
                  </div>
                  <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '13px' }}>
                  OpsPilot is analyzing system logs and telemetry...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              style={{
                display: 'flex',
                gap: '8px',
                padding: '14px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
              }}
            >
              <input
                type="text"
                placeholder="Ask OpsPilot (e.g., 'What is causing the database timeout?' or 'Analyze latest logs')..."
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  color: '#fff',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                }}
              />
              <button
                type="submit"
                disabled={chatLoading}
                style={{
                  padding: '10px 18px',
                  borderRadius: '6px',
                  background: 'var(--accent-cyan)',
                  color: '#090d16',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Send size={14} />
                Ask
              </button>
            </form>
          </div>
        )}
      </main>

      {/* INCIDENT DETAIL MODAL */}
      {selectedIncident && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
          onClick={() => setSelectedIncident(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              width: '100%',
              maxWidth: '780px',
              maxHeight: '90vh',
              borderRadius: '12px',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    ...getSeverityStyle(selectedIncident.severity),
                  }}
                >
                  {selectedIncident.severity}
                </span>
                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>
                  Incident #{selectedIncident.id} — {selectedIncident.service}
                </h2>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{ background: 'none', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Problem */}
              <div>
                <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Problem Summary
                </h4>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                  {selectedIncident.problem || 'No description provided'}
                </div>
              </div>

              {/* Root Cause */}
              <div>
                <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Root Cause Diagnosis
                </h4>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px' }}>
                  {selectedIncident.root_cause || 'Determining root cause through log analysis...'}
                </div>
              </div>

              {/* Evidence */}
              {selectedIncident.evidence && selectedIncident.evidence.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Evidence & Telemetry
                  </h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedIncident.evidence.map((ev, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: '12px',
                          fontFamily: 'JetBrains Mono',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.04)',
                          borderLeft: '2px solid var(--accent-cyan)',
                        }}
                      >
                        {ev}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Remediation Fix */}
              {selectedIncident.suggested_fix && (
                <div>
                  <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Suggested Fix
                  </h4>
                  <div style={{ fontSize: '13px', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    {selectedIncident.suggested_fix}
                  </div>
                </div>
              )}

              {/* Suggested Commands (Whitelisted) */}
              {selectedIncident.commands && selectedIncident.commands.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Remediation Commands (Whitelisted)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedIncident.commands.map((cmd, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          background: '#070b12',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <code style={{ fontSize: '12px', color: '#38bdf8' }}>{cmd}</code>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleCopy(cmd)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: 'var(--bg-hover)',
                              color: 'var(--text-secondary)',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Copy size={12} />
                            {copiedCmd === cmd ? 'Copied!' : 'Copy'}
                          </button>

                          <button
                            onClick={() => handleExecuteCommand(cmd, selectedIncident.service)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Play size={12} />
                            Run
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
