import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Team, Report, TeamStatus, Facility, TeamType } from '../types';
import Map from './Map';
import { Navigation, CheckSquare, Clock, MapPin, Loader2, LogOut, Shield, ChevronRight, Activity, Brain, CloudRain, AlertCircle, RefreshCw, Radio, Send, Hospital, Building2, Fuel } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { optimizeRoute, suggestNearbyFacilities } from '../services/geminiService';

export default function RescueTeamPanel() {
  const { user, profile, signOut } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [assignedReport, setAssignedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReoptimizing, setIsReoptimizing] = useState(false);
  const [nearbyFacilities, setNearbyFacilities] = useState<Facility[]>([]);
  const [isFindingFacilities, setIsFindingFacilities] = useState(false);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [showBroadcastPanel, setShowBroadcastPanel] = useState(false);
  const [simulationAlert, setSimulationAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchTeam = async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('leader_id', user.id)
        .single();

      if (data) {
        setTeam(data as Team);
        if (data.assigned_report_id) {
          fetchReport(data.assigned_report_id);
        }
      } else if (error && error.code === 'PGRST116') {
        createInitialTeam(user.id, profile?.display_name || user.user_metadata.full_name || 'Rescue Unit');
      }
    };

    fetchTeam();

    const teamChannel = supabase.channel('my-team').on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'teams',
      filter: `leader_id=eq.${user.id}`
    }, (payload) => {
      const updatedTeam = payload.new as Team;
      setTeam(updatedTeam);
      if (updatedTeam.assigned_report_id) {
        fetchReport(updatedTeam.assigned_report_id);
      } else {
        setAssignedReport(null);
      }
    }).subscribe();

    // Location update interval
    const interval = setInterval(() => {
      if (navigator.geolocation && team) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await supabase.from('teams').update({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            updated_at: new Date().toISOString()
          }).eq('id', team.id);
        });
      }
    }, 10000);

    return () => {
      supabase.removeChannel(teamChannel);
      clearInterval(interval);
    };
  }, [user]);

  const fetchReport = async (id: string) => {
    const { data, error } = await supabase.from('reports').select('*').eq('id', id).single();
    if (data) setAssignedReport(data as Report);
  };

  const createInitialTeam = async (uid: string, name: string) => {
    try {
      const type: TeamType = ['ambulance', 'fire_brigade', 'police'][Math.floor(Math.random() * 3)] as TeamType;
      await supabase.from('users').update({ role: 'rescue_team' }).eq('id', uid);
      
      const { data, error } = await supabase.from('teams').insert({
        name,
        type,
        status: 'idle',
        leader_id: uid,
        latitude: 19.0760,
        longitude: 72.8777,
      }).select().single();

      if (data) setTeam(data as Team);
    } catch (e) {
      console.error("Error bootstrapping team:", e);
    }
  };

  const updateStatus = async (newStatus: TeamStatus) => {
    if (!team) return;
    setLoading(true);
    try {
      if (newStatus === 'completed') {
        if (team.assigned_report_id) {
          await supabase.from('reports').update({ status: 'resolved', updated_at: new Date().toISOString() }).eq('id', team.assigned_report_id);
        }
        await supabase.from('teams').update({ status: 'idle', assigned_report_id: null, updated_at: new Date().toISOString() }).eq('id', team.id);
      } else {
        await supabase.from('teams').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', team.id);
      }
    } catch (err: any) {
      console.error("Error updating status:", err);
      alert("Failed to update status: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualReoptimize = async () => {
    if (!team || !assignedReport) return;
    setIsReoptimizing(true);
    try {
      const newOptimization = await optimizeRoute(assignedReport, team);
      await supabase.from('reports').update({ ai_optimization: newOptimization, updated_at: new Date().toISOString() }).eq('id', assignedReport.id);
    } catch (e) {
      console.error("Manual re-optimization failed", e);
    } finally {
      setIsReoptimizing(false);
    }
  };

  const handleFindFacilities = async () => {
    if (!assignedReport) return;
    setIsFindingFacilities(true);
    try {
      const facilities = await suggestNearbyFacilities({ latitude: assignedReport.latitude, longitude: assignedReport.longitude });
      setNearbyFacilities(facilities);
      setSelectedFacilities(facilities.map(f => f.id));
      setBroadcastMessage(`EMERGENCY ALERT: ${assignedReport.type.toUpperCase()} at ${assignedReport.latitude.toFixed(4)}, ${assignedReport.longitude.toFixed(4)}. Support requested.`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFindingFacilities(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!assignedReport || !user || !broadcastMessage || selectedFacilities.length === 0) return;
    setIsSendingBroadcast(true);
    try {
      const targets = nearbyFacilities.filter(f => selectedFacilities.includes(f.id)).map(f => f.type);
      const uniqueTypes = Array.from(new Set(targets));

      const { error } = await supabase.from('broadcasts').insert({
        report_id: assignedReport.id,
        sender_id: user.id,
        sender_name: team?.name || 'Rescue Unit',
        sender_type: 'rescue_unit',
        target_facility_types: uniqueTypes,
        message: broadcastMessage,
      });
      
      if (error) throw error;
      setShowBroadcastPanel(false);
      setNearbyFacilities([]);
      setSelectedFacilities([]);
      setBroadcastMessage('');
      alert("Broadcast alert sent to all selected agencies successfully.");
    } catch (err: any) {
      console.error("Error sending broadcast:", err);
      alert("Failed to send broadcast: " + err.message);
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-bg-dark text-text-primary overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-gray-800 bg-card-dark">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-emerald rounded flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tighter uppercase italic">
              RESQ<span className="text-brand-emerald">UNIT</span> <span className="text-[10px] bg-emerald-900/50 text-brand-emerald px-2 py-0.5 ml-2 rounded font-mono non-italic uppercase tracking-widest">Team Portal</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-text-secondary uppercase font-mono">{team?.name || 'Unit Alpha'}</p>
            <p className="text-[9px] text-brand-emerald font-mono uppercase">Role: Leader</p>
          </div>
          <button onClick={signOut} className="p-2 hover:bg-gray-800 rounded transition-colors text-text-secondary">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
        <aside className="w-full sm:w-96 border-r border-gray-800 bg-bg-dark z-10 p-4 flex flex-col gap-6">
          <section>
            <h2 className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Navigation className="w-3 h-3" /> Current Deployment
            </h2>
            
            {assignedReport ? (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card-dark border border-brand-emerald/30 rounded-xl p-6 shadow-2xl relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[8px] font-bold px-2 py-1 rounded uppercase font-mono tracking-widest ${priorityColors[assignedReport.priority]}`}>
                    {assignedReport.priority} PRIORITY
                  </span>
                  <span className="text-[9px] text-brand-emerald font-mono animate-pulse">LIVE TRACKING ACTIVE</span>
                </div>

                <h3 className="text-base font-bold text-white mb-2 uppercase tracking-tight">{assignedReport.title}</h3>
                <p className="text-xs text-text-secondary mb-6 leading-relaxed bg-bg-dark/50 p-3 rounded border border-gray-800/50 italic italic">
                  "{assignedReport.description}"
                </p>

                {assignedReport.media_urls && assignedReport.media_urls.length > 0 && (
                  <div className="mb-6 flex gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                    {assignedReport.media_urls.map((url, idx) => (
                      <div key={idx} className="shrink-0 w-24 h-24 rounded-lg border border-gray-700 overflow-hidden bg-bg-dark shadow-inner">
                        {url.startsWith('data:video') ? <video src={url} className="w-full h-full object-cover" /> : <img src={url} className="w-full h-full object-cover" alt="Evidence" />}
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-brand-red" />
                    <div className="text-[10px]">
                      <p className="text-gray-500 uppercase tracking-widest leading-none mb-1">Target Coordinates</p>
                      <p className="text-white font-mono font-bold tracking-tighter">{assignedReport.latitude.toFixed(6)}, {assignedReport.longitude.toFixed(6)}</p>
                    </div>
                  </div>

                  {assignedReport.ai_optimization && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 pt-4 border-t border-gray-800 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2 bg-brand-emerald/10 border border-brand-emerald/20 px-2 py-1 rounded w-full">
                        <div className="flex items-center gap-2">
                          <Brain className="w-3 h-3 text-brand-emerald" />
                          <span className="text-[8px] font-bold text-brand-emerald font-mono uppercase">AI Tactical Analysis</span>
                        </div>
                        <button 
                          onClick={handleManualReoptimize}
                          disabled={isReoptimizing}
                          className="p-1 hover:bg-emerald-900/30 rounded text-brand-emerald transition-colors"
                        >
                          <RefreshCw className={`w-3 h-3 ${isReoptimizing ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Navigation className="w-3 h-3 text-brand-emerald" />
                            <span className="text-[8px] text-gray-500 uppercase tracking-widest">Optimized Route</span>
                          </div>
                          <p className="text-[10px] text-white leading-relaxed font-medium">{assignedReport.ai_optimization?.suggestedRoute || "Detecting optimal rescue path..."}</p>
                        </div>
 
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CloudRain className="w-3 h-3 text-blue-400" />
                              <span className="text-[8px] text-gray-500 uppercase tracking-widest">Weather</span>
                            </div>
                            <p className="text-[10px] text-white">{assignedReport.ai_optimization?.weatherConditions || "Monitoring..."}</p>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-3 h-3 text-orange-400" />
                              <span className="text-[8px] text-gray-500 uppercase tracking-widest">Est. Time</span>
                            </div>
                            <p className="text-[10px] text-white font-mono">{assignedReport.ai_optimization?.estimatedTime || "--:--"}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (team?.latitude && assignedReport?.latitude) {
                              const url = `https://www.google.com/maps/dir/?api=1&origin=${team.latitude},${team.longitude}&destination=${assignedReport.latitude},${assignedReport.longitude}&travelmode=driving`;
                              window.open(url, '_blank');
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600/20 border border-blue-500 text-blue-400 rounded-lg font-bold uppercase text-[9px] tracking-[0.2em] hover:bg-blue-600/30 transition-all group"
                        >
                          <Navigation className="w-4 h-4" />
                          Start Navigation
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="py-12 border border-dashed border-gray-800 rounded-xl flex flex-col items-center justify-center text-center opacity-50">
                <Shield className="w-8 h-8 text-gray-700 mb-4" />
                <p className="text-xs font-mono uppercase tracking-widest">No Active Missions</p>
                <p className="text-[10px] mt-2">Stand by for command center dispatch</p>
              </div>
            )}
          </section>

          <section className="flex-1 flex flex-col gap-3">
            <h2 className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
              <Activity className="w-3 h-3" /> Mission Status Control
            </h2>
            
            <div className="grid grid-cols-1 gap-2">
              <StatusBtn active={team?.status === 'en_route'} onClick={() => updateStatus('en_route')} icon={<Navigation className="w-4 h-4" />} label="En Route to site" />
              <StatusBtn active={team?.status === 'on_scene'} onClick={() => updateStatus('on_scene')} icon={<MapPin className="w-4 h-4" />} label="Arrived on scene" />
              <StatusBtn active={team?.status === 'rescue_in_progress'} onClick={() => updateStatus('rescue_in_progress')} icon={<Loader2 className={`w-4 h-4 ${team?.status === 'rescue_in_progress' ? 'animate-spin' : ''}`} />} label="Rescue in progress" />
              <StatusBtn active={false} onClick={() => updateStatus('completed')} icon={<CheckSquare className="w-4 h-4" />} label="Mark as COMPLETED" variant="emerald" />

              <button 
                onClick={() => setShowBroadcastPanel(true)}
                className="w-full mt-2 p-4 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 font-bold uppercase text-[10px] tracking-widest flex items-center justify-between hover:bg-red-900/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Radio className="w-4 h-4 animate-pulse" />
                  Inter-agency Alert
                </div>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>
        </aside>

        <section className="flex-1 relative">
          <Map 
            center={team?.latitude ? [team.latitude, team.longitude] : [19.0760, 72.8777]}
            zoom={15}
            hazards={assignedReport?.ai_optimization?.hazards}
            routePath={assignedReport?.ai_optimization?.pathCoordinates}
            markers={[
              ...(team ? [{ id: team.id, position: [team.latitude, team.longitude] as [number, number], title: "Your Unit: " + team.name, color: 'blue' as any }] : []),
              ...(assignedReport ? [{ id: assignedReport.id, position: [assignedReport.latitude, assignedReport.longitude] as [number, number], title: "INCIDENT: " + assignedReport.title, color: 'red' as any }] : [])
            ]}
          />
        </section>
      </main>

      <AnimatePresence>
        {simulationAlert && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[3000] bg-brand-red text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-2xl shadow-red-500/40">
            <RefreshCw className="w-3 h-3 animate-spin" />
            {simulationAlert}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBroadcastPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-card-dark border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                    <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-tighter italic">Inter-agency Broadcast</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Multi-unit tactical coordination</p>
                  </div>
                </div>
                <button onClick={() => setShowBroadcastPanel(false)} className="text-gray-500 hover:text-white">
                  <AlertCircle className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">1. Identify Nearby Agencies</label>
                  <button onClick={handleFindFacilities} disabled={isFindingFacilities} className="w-full bg-brand-emerald text-white p-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg shadow-brand-emerald/20">
                    {isFindingFacilities ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                    Scan for Nearby Units & Stations
                  </button>
                </div>

                {nearbyFacilities.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">2. Select Recipients</label>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {nearbyFacilities.map((f) => (
                          <div 
                            key={f.id}
                            onClick={() => selectedFacilities.includes(f.id) ? setSelectedFacilities(selectedFacilities.filter(id => id !== f.id)) : setSelectedFacilities([...selectedFacilities, f.id])}
                            className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${selectedFacilities.includes(f.id) ? 'bg-brand-emerald/10 border-brand-emerald text-brand-emerald' : 'bg-bg-dark border-gray-800 text-gray-400 hover:border-gray-600'}`}
                          >
                            <div className="flex items-center gap-3">
                              {f.type === 'hospital' && <Hospital className="w-4 h-4" />}
                              {f.type === 'police_station' && <Building2 className="w-4 h-4" />}
                              {f.type === 'petrol_pump' && <Fuel className="w-4 h-4" />}
                              <div>
                                <p className="text-xs font-bold">{f.name}</p>
                                <p className="text-[9px] uppercase tracking-wider">{f.type.replace('_', ' ')} • {f.distance}km</p>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedFacilities.includes(f.id) ? 'border-brand-emerald bg-brand-emerald text-white' : 'border-gray-800'}`}>
                              {selectedFacilities.includes(f.id) && <CheckSquare className="w-2 h-2" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">3. Tactical Message</label>
                      <textarea value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} className="w-full bg-bg-dark border border-gray-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-brand-emerald min-h-[80px]" placeholder="Detail the emergency requirement..." />
                    </div>

                    <button onClick={handleSendBroadcast} disabled={isSendingBroadcast || selectedFacilities.length === 0} className="w-full bg-red-600 text-white p-4 rounded-xl text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-red-700 disabled:opacity-50 transition-all shadow-xl shadow-red-600/30 italic">
                      {isSendingBroadcast ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      Execute Emergency Broadcast
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBtn({ active, onClick, icon, label, variant = 'blue' }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, variant?: 'blue' | 'emerald' }) {
  const baseClasses = "w-full p-4 rounded-lg font-bold uppercase text-[10px] tracking-widest flex items-center justify-between transition-all border group";
  const activeClasses = variant === 'blue' ? "bg-brand-blue border-brand-blue text-white" : "bg-brand-emerald border-brand-emerald text-white";
  const inactiveClasses = "bg-card-dark border-gray-800 text-text-secondary hover:border-gray-600 hover:text-white";

  return (
    <button onClick={onClick} className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}>
      <div className="flex items-center gap-3">{icon}{label}</div>
      <ChevronRight className={`w-4 h-4 transition-transform ${active ? 'translate-x-1' : 'group-hover:translate-x-1 opacity-30'}`} />
    </button>
  );
}

const priorityColors = {
  low: 'bg-green-900/30 text-brand-emerald',
  medium: 'bg-blue-900/30 text-brand-blue',
  high: 'bg-orange-900/30 text-orange-500',
  critical: 'bg-red-900/50 text-brand-red border border-red-500/30'
};
