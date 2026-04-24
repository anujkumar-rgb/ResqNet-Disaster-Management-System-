import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Report, Team, ResourceItem, RouteOptimization, Broadcast } from '../types';
import Map from './Map';
import { Shield, Users, Radio, Clock, Zap, Brain, MessageSquare, Hospital, Loader2, Fuel, ChevronRight, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { optimizeRoute, suggestNearbyFacilities } from '../services/geminiService';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: reportsData } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      const { data: teamsData } = await supabase.from('teams').select('*');
      const { data: resourcesData } = await supabase.from('resources').select('*');
      const { data: broadcastsData } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false });

      if (reportsData) setReports(reportsData as Report[]);
      if (teamsData) setTeams(teamsData as Team[]);
      if (resourcesData) setResources(resourcesData as ResourceItem[]);
      if (broadcastsData) setBroadcasts(broadcastsData as Broadcast[]);
    };

    fetchData();

    // Set up real-time subscriptions
    const reportsChannel = supabase.channel('reports-all').on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
      if (payload.eventType === 'INSERT') setReports(prev => [payload.new as Report, ...prev]);
      if (payload.eventType === 'UPDATE') setReports(prev => prev.map(r => r.id === payload.new.id ? payload.new as Report : r));
      if (payload.eventType === 'DELETE') setReports(prev => prev.filter(r => r.id === payload.old.id));
    }).subscribe();

    const teamsChannel = supabase.channel('teams-all').on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
      if (payload.eventType === 'INSERT') setTeams(prev => [payload.new as Team, ...prev]);
      if (payload.eventType === 'UPDATE') setTeams(prev => prev.map(t => t.id === payload.new.id ? payload.new as Team : t));
      if (payload.eventType === 'DELETE') setTeams(prev => prev.filter(t => t.id === payload.old.id));
    }).subscribe();

    const resourcesChannel = supabase.channel('resources-all').on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, (payload) => {
      if (payload.eventType === 'UPDATE') setResources(prev => prev.map(r => r.id === payload.new.id ? payload.new as ResourceItem : r));
    }).subscribe();

    const broadcastsChannel = supabase.channel('broadcasts-all').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, (payload) => {
      setBroadcasts(prev => [payload.new as Broadcast, ...prev]);
    }).subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(resourcesChannel);
      supabase.removeChannel(broadcastsChannel);
    };
  }, []);

  const assignTeam = async (reportId: string, teamId: string) => {
    setLoading(true);
    try {
      const team = teams.find(t => t.id === teamId);
      const report = reports.find(r => r.id === reportId);
      
      let ai_optimization: RouteOptimization | undefined = undefined;
      
      if (team && report) {
        ai_optimization = await optimizeRoute(report, team);
      }

      const { error: reportError } = await supabase.from('reports').update({
        status: 'assigned',
        ai_optimization,
        updated_at: new Date().toISOString()
      }).eq('id', reportId);

      const { error: teamError } = await supabase.from('teams').update({
        status: 'en_route',
        assigned_report_id: reportId,
        updated_at: new Date().toISOString()
      }).eq('id', teamId);

      if (reportError || teamError) throw reportError || teamError;
      setSelectedReport(null);
    } catch (err: any) {
      console.error("Error assigning team:", err);
      alert("Failed to assign team: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async (report: Report, targetTypes: Array<'hospital' | 'police_station' | 'petrol_pump'>) => {
    if (!user || isBroadcasting) return;
    setIsBroadcasting(true);
    try {
      const facilities = await suggestNearbyFacilities({ latitude: report.latitude, longitude: report.longitude });
      const targets = facilities.filter(f => targetTypes.includes(f.type));
      
      if (targets.length === 0) {
        alert("No nearby tactical facilities of this type identified within relevant range.");
        return;
      }

      const typeLabel = targetTypes.join(' & ').replace(/_/g, ' ').toUpperCase();

      const { error } = await supabase.from('broadcasts').insert({
        report_id: report.id,
        sender_id: user.id,
        sender_name: "HQ COMMAND",
        sender_type: 'admin',
        target_facility_types: targetTypes,
        message: `TACTICAL ALERT [REPORT ID: ${report.id.slice(-6).toUpperCase()}]: ${report.type.toUpperCase()} reported @ [${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}]. Priority coordination requested for ${typeLabel} units.`,
      });
      
      if (error) throw error;
      alert(`Broadcast alert sent to ${targets.length} nearby ${typeLabel} units.`);
    } catch (err: any) {
      console.error("Error sending broadcast:", err);
      alert("Failed to send broadcast: " + err.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const activeReports = reports.filter(r => r.status !== 'resolved');
  const solvedCount = reports.filter(r => r.status === 'resolved').length;

  return (
    <div className="h-screen bg-bg-dark text-text-primary p-4 flex flex-col gap-4 overflow-hidden">
      <header className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-red rounded flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase italic">
              RESQ<span className="text-brand-red">NET</span> <span className="text-brand-red text-[10px] font-mono border border-red-500/30 px-2 py-0.5 ml-2 rounded non-italic uppercase">EMERGENCY MODE ACTIVE</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest text-opacity-70">CONTROL CENTER ALPHA • GLOBAL SECTOR 01 • {new Date().toLocaleTimeString()} UTC</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Avg Response Time</p>
            <p className="text-lg font-mono text-brand-emerald font-bold tracking-tighter">4:22 <span className="text-[10px] text-opacity-50">MIN</span></p>
          </div>
          <div className="text-right border-l border-gray-800 pl-6">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Active Cases</p>
            <p className="text-lg font-mono text-white font-bold tracking-tighter">{activeReports.length} <span className="text-[10px] text-brand-red text-opacity-80">CRITICAL</span></p>
          </div>
          <div className="flex gap-2 ml-4">
            <a href="/citizen" className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold px-4 py-2 rounded-lg transition-all uppercase tracking-widest flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Citizen View
            </a>
            <button onClick={signOut} className="bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all p-2 rounded-lg" title="Sign Out">
              <Zap className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
        <aside className="col-span-3 flex flex-col gap-3 overflow-hidden bg-card-dark border border-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Incoming Reports</h2>
            <span className="text-[10px] bg-brand-red/20 text-brand-red font-mono px-2 rounded-full border border-brand-red/30">
              {activeReports.filter(r => r.status === 'pending').length} NEW
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
            {activeReports.map(report => (
              <motion.div 
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`cursor-pointer rounded p-2 border-l-4 transition-all ${selectedReport?.id === report.id ? 'bg-card-active border-brand-red' : 'bg-bg-dark border-gray-800 hover:border-gray-700'} ${report.status === 'pending' ? 'border-l-brand-red' : 'border-l-orange-500'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-bold text-text-secondary font-mono">#{report.id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-[8px] text-gray-500 uppercase font-mono">{report.type}</span>
                </div>
                <p className="text-xs font-bold mt-1 text-white truncate">{report.title}</p>
                {report.status === 'assigned' && (
                  <div className="mt-2 flex items-center gap-1.5 text-[8px] text-brand-emerald font-bold uppercase tracking-widest">
                    <Users className="w-2.5 h-2.5" />
                    {teams.find(t => t.assigned_report_id === report.id)?.name || 'UNIT DISPATCHED'}
                  </div>
                )}
                <div className="mt-2 flex gap-1">
                  <span className="bg-gray-800/50 text-[8px] px-1.5 py-0.5 rounded text-gray-400 border border-gray-800 uppercase font-mono">{report.priority}</span>
                  {report.status === 'pending' && <span className="bg-brand-red/10 text-[8px] px-1.5 py-0.5 rounded text-brand-red font-mono border border-brand-red/10 animate-pulse uppercase">PENDING</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </aside>

        <section className="col-span-6 flex flex-col gap-4">
          <div className="relative bg-[#111318] border border-gray-800 rounded-lg flex-1 overflow-hidden">
            <Map 
              center={selectedReport ? [selectedReport.latitude, selectedReport.longitude] : [19.0760, 72.8777]}
              zoom={selectedReport ? 15 : 12}
              hazards={selectedReport?.ai_optimization?.hazards}
              routePath={selectedReport?.ai_optimization?.pathCoordinates}
              markers={[
                ...reports.map(r => ({
                  id: r.id,
                  position: [r.latitude, r.longitude] as [number, number],
                  title: r.title,
                  type: teams.find(t => t.assigned_report_id === r.id) ? `TACTICAL ASSIGNMENT: ${teams.find(t => t.assigned_report_id === r.id)?.name}` : r.type,
                  color: (r.status === 'pending' ? 'red' : 'orange') as any
                })),
                ...teams.map(t => ({
                  id: t.id,
                  position: [t.latitude, t.longitude] as [number, number],
                  title: t.name,
                  type: reports.find(r => r.id === t.assigned_report_id) ? `EN ROUTE: ${reports.find(r => r.id === t.assigned_report_id)?.title}` : `STATUS: ${t.status}`,
                  color: (t.status === 'idle' ? 'green' : t.status === 'on_scene' ? 'orange' : 'blue') as any
                }))
              ]}
            />
            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur p-2 border border-white/5 rounded text-[9px] font-mono text-text-secondary z-[1000] tracking-widest uppercase">
              Global Deployment Active • Tracking {teams.length} Units
            </div>
            
            {selectedReport && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-4 left-4 right-4 bg-black/90 backdrop-blur border border-brand-red/30 p-4 rounded-lg z-[1000] shadow-2xl"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">{selectedReport.title}</h3>
                    <p className="text-[10px] text-gray-400 mt-1">{selectedReport.description}</p>
                    
                    {selectedReport.media_urls && selectedReport.media_urls.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                        {selectedReport.media_urls.map((url, idx) => (
                          <div key={idx} className="shrink-0 w-16 h-16 rounded border border-gray-800 overflow-hidden bg-bg-dark">
                            {url.startsWith('data:video') ? (
                              <video src={url} className="w-full h-full object-cover" />
                            ) : (
                              <img src={url} className="w-full h-full object-cover" alt="Evidence" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedReport.ai_optimization && (
                    <div className="flex items-center gap-2 bg-brand-emerald/10 border border-brand-emerald/20 px-2 py-1 rounded">
                      <Brain className="w-3 h-3 text-brand-emerald" />
                      <span className="text-[8px] font-bold text-brand-emerald font-mono uppercase">AI Optimized</span>
                    </div>
                  )}
                  <button onClick={() => setSelectedReport(null)} className="text-gray-500 hover:text-white">
                    <Clock className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Impact Radius</p>
                      <p className="text-xs font-mono text-brand-red font-bold">2.4 KM</p>
                    </div>
                    <div className="border-l border-gray-800 pl-4">
                      <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Status</p>
                      <p className="text-xs font-mono text-orange-500 uppercase font-bold">{selectedReport.status}</p>
                    </div>
                    {selectedReport.status === 'assigned' && (
                      <div className="border-l border-gray-800 pl-4">
                        <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Assigned Unit</p>
                        <p className="text-xs font-mono text-brand-emerald uppercase font-bold">
                          {teams.find(t => t.assigned_report_id === selectedReport.id)?.name || 'SYNCHRONIZING...'}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleBroadcast(selectedReport, ['hospital'])}
                      disabled={isBroadcasting}
                      className="bg-red-900/40 border border-red-500/30 text-red-500 text-[9px] font-mono px-3 py-2 rounded hover:bg-red-900/60 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isBroadcasting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Hospital className="w-3 h-3" />}
                      ALERT HOSPITALS
                    </button>
                    <button 
                      onClick={() => handleBroadcast(selectedReport, ['police_station'])}
                      disabled={isBroadcasting}
                      className="bg-blue-900/40 border border-blue-500/30 text-blue-500 text-[9px] font-mono px-3 py-2 rounded hover:bg-blue-900/60 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isBroadcasting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                      ALERT POLICE
                    </button>
                    <select 
                      onChange={(e) => assignTeam(selectedReport.id, e.target.value)}
                      className="bg-bg-dark border border-gray-800 text-[10px] font-mono text-text-primary px-3 py-2 rounded focus:border-brand-red outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled>Dispatch Team...</option>
                      {teams.filter(t => t.status === 'idle').map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="bg-card-dark border border-gray-800 rounded-lg p-3 flex justify-between items-center">
            <div className="flex gap-8">
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">System Health</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-emerald rounded-full"></div>
                  <span className="text-[10px] font-mono text-brand-emerald font-bold">OPERATIONAL</span>
                </div>
              </div>
              <div className="border-l border-gray-800 pl-8">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Network Latency</p>
                <p className="text-xs font-mono text-white font-bold italic">14ms</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Global Heatmap: <span className="text-brand-red">Active</span></span>
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-bg-dark bg-gray-800 overflow-hidden text-[8px] flex items-center justify-center font-bold">U{i}</div>)}
              </div>
            </div>
          </div>
        </section>

        <aside className="col-span-3 flex flex-col gap-4 overflow-hidden">
          <div className="bg-card-dark border border-gray-800 rounded-lg p-3 flex flex-col gap-4 h-1/2 overflow-hidden">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-800 pb-2">Logistics Center</h2>
            <div className="space-y-4 overflow-y-auto pr-1">
              {resources.map(res => (
                <div key={res.id}>
                  <div className="flex justify-between text-[9px] mb-1.5 uppercase font-mono tracking-tighter">
                    <span className="text-gray-400">{res.name}</span>
                    <span className="text-white font-bold">{res.available_count}/{res.total_count}</span>
                  </div>
                  <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(res.available_count / res.total_count) * 100}%` }}
                      className="h-full bg-brand-emerald shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                    ></motion.div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card-dark border border-gray-800 rounded-lg p-3 flex flex-col gap-3 flex-1 overflow-hidden">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-800 pb-2">Operational Units</h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {teams.map(team => (
                <div key={team.id} className="flex items-center gap-3 p-2 bg-card-active rounded border border-gray-800 group transition-all hover:border-gray-600">
                  <div className={`w-2 h-2 rounded-full ${teamStatusColors[team.status] || 'bg-gray-500'}`}></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-white uppercase tracking-tight">{team.name} <span className="text-gray-500 font-mono ml-2">ID:{team.id.slice(0,4)}</span></p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-tighter mt-1">{team.status.replace('_', ' ')} • {team.type}</p>
                    {team.assigned_report_id && (
                      <div className="mt-1 flex items-center gap-1.5 text-[7px] text-brand-emerald font-bold uppercase tracking-widest">
                        <AlertTriangle className="w-2 h-2" />
                        MISSION: {reports.find(r => r.id === team.assigned_report_id)?.title.slice(0, 20)}...
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-700 group-hover:text-white transition-colors" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card-dark border border-gray-800 rounded-lg p-3 flex flex-col gap-3 flex-1 overflow-hidden min-h-[300px]">
            <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
                <Radio className="w-3 h-3 animate-pulse" />
                Communications Log
              </h2>
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">{broadcasts.length} LOGS</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {broadcasts.map(broadcast => (
                <div key={broadcast.id} className="p-3 bg-red-950/10 border border-red-500/10 rounded-lg group hover:border-red-500/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {broadcast.sender_type === 'admin' ? <Shield className="w-3 h-3 text-red-500" /> : <Zap className="w-3 h-3 text-blue-400" />}
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter leading-none">{broadcast.sender_name}</span>
                      </div>
                      <span className="text-[7px] text-gray-600 uppercase font-bold tracking-widest mt-1">SENDER ID: {broadcast.sender_id.slice(-4)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] text-white font-mono block leading-none">{new Date(broadcast.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-200 leading-relaxed mb-2 font-medium italic border-l-2 border-red-500/20 pl-2">
                    {broadcast.message}
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {broadcast.target_facility_types.map(type => (
                      <div key={type} className="flex items-center gap-1 px-2 py-0.5 bg-red-900/30 rounded border border-red-500/10">
                        {type === 'hospital' && <Hospital className="w-2 h-2 text-red-400" />}
                        {type === 'police_station' && <Shield className="w-2 h-2 text-blue-400" />}
                        {type === 'petrol_pump' && <Fuel className="w-2 h-2 text-yellow-400" />}
                        <span className="text-[7px] text-gray-300 uppercase font-bold tracking-widest">{type.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <footer className="h-12 bg-black border border-gray-800 rounded-lg flex items-center px-4 justify-between">
        <div className="flex items-center gap-6">
           <span className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
             <span className="w-1.5 h-1.5 bg-brand-emerald rounded-full animate-pulse"></span> DB SYNCHRONIZED
           </span>
        </div>
        <div className="flex items-center gap-12">
          <div className="flex gap-8">
            <div className="text-center">
              <span className="block text-[8px] text-gray-500 uppercase tracking-widest mb-1">Solved (24H)</span>
              <span className="text-sm font-mono font-bold text-white leading-none tracking-tighter">{solvedCount}</span>
            </div>
          </div>
          <div className="bg-brand-red/10 border border-brand-red/20 px-6 py-2 rounded flex items-center gap-4">
            <div className="text-brand-red text-[10px] font-bold animate-pulse tracking-widest font-mono">BROADCAST ACTIVE:</div>
            <marquee className="text-white text-[10px] font-bold font-mono w-64 uppercase tracking-tighter">PREDICTIVE ANALYTICS SUGGEST HIGH RISK IN SECTOR 7 • MAINTAIN READINESS • </marquee>
          </div>
        </div>
      </footer>
    </div>
  );
}

const teamStatusColors = {
  idle: 'bg-gray-500',
  en_route: 'bg-brand-blue animate-pulse',
  on_scene: 'bg-orange-500 animate-pulse',
  rescue_in_progress: 'bg-brand-red animate-pulse',
  completed: 'bg-brand-emerald',
  refueling: 'bg-yellow-500'
};
