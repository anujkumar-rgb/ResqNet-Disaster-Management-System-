import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Report, IncidentType, Priority } from '../types';
import Map from './Map';
import { AlertCircle, Send, LogOut, Loader2, Camera, MapPin, Bell, Mic, MicOff, Flame, ShieldAlert, Stethoscope, Waves, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Add type for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: any;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const types = ['fire', 'accident', 'medical', 'flood', 'earthquake', 'other'];

const typeIcons: Record<string, React.ReactNode> = {
  fire: <Flame className="w-4 h-4" />,
  accident: <ShieldAlert className="w-4 h-4" />,
  medical: <Stethoscope className="w-4 h-4" />,
  flood: <Waves className="w-4 h-4" />,
  earthquake: <Activity className="w-4 h-4" />,
  other: <AlertCircle className="w-4 h-4" />
};

const priorityColors = {
  low: 'bg-green-900/30 text-brand-emerald',
  medium: 'bg-blue-900/30 text-brand-blue',
  high: 'bg-orange-900/30 text-orange-500',
  critical: 'bg-red-900/50 text-brand-red border border-red-500/30'
};

const statusColors = {
  pending: 'text-brand-red',
  assigned: 'text-orange-500',
  resolved: 'text-brand-emerald'
};

export default function CitizenPanel() {
  const { user, profile, signOut } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isReporting, setIsReporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  
  // Form state
  const [type, setType] = useState<IncidentType>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [mediaFiles, setMediaFiles] = useState<{ file: File; preview: string }[]>([]);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US';

      recog.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setDescription(transcript);
      };

      recog.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      setRecognition(recog);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // Auto-locate
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }

    // Initial fetch
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error) setReports(data as Report[]);
    };

    fetchReports();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('citizen-reports')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports',
        filter: `reporter_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setReports(prev => [payload.new as Report, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setReports(prev => prev.map(r => r.id === payload.new.id ? payload.new as Report : r));
        } else if (payload.eventType === 'DELETE') {
          setReports(prev => prev.filter(r => r.id === payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const newMedia = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setMediaFiles(prev => [...prev, ...newMedia]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !user) return;
    
    setLoading(true);
    try {
      const media_urls = await Promise.all(
        mediaFiles.map(m => fileToBase64(m.file))
      );

      const { error } = await supabase.from('reports').insert({
        type,
        title,
        description,
        latitude: location[0],
        longitude: location[1],
        priority,
        status: 'pending',
        reporter_id: user.id,
        reporter_name: profile?.display_name || user.user_metadata.full_name,
        media_urls,
      });

      if (error) throw error;
      setIsReporting(false);
      resetForm();
    } catch (err: any) {
      console.error("Error creating report:", err);
      alert("Failed to submit report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSOS = async () => {
    if (!location || !user) {
      alert("Please enable location services for SOS");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.from('reports').insert({
        type: 'other',
        title: 'SOS EMERGENCY SIGNAL',
        description: 'Auto-generated SOS emergency signal from mobile device.',
        latitude: location[0],
        longitude: location[1],
        priority: 'critical',
        status: 'pending',
        reporter_id: user.id,
        reporter_name: profile?.display_name || user.user_metadata.full_name,
        media_urls: [],
      });
      if (error) throw error;
      alert("SOS Signal Sent. Help is on the way.");
    } catch (err: any) {
      console.error("Error sending SOS:", err);
      alert("Failed to send SOS: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setType('other');
    setTitle('');
    setDescription('');
    setPriority('medium');
    mediaFiles.forEach(m => URL.revokeObjectURL(m.preview));
    setMediaFiles([]);
  };

  return (
    <div className="h-screen flex flex-col bg-bg-dark text-text-primary">
      <header className="flex items-center justify-between p-4 border-b border-gray-800 bg-card-dark">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-red rounded shadow-[0_0_10px_rgba(220,38,38,0.3)]">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase italic">
              Resq<span className="text-brand-red">Net</span> <span className="text-[10px] bg-red-900/50 text-brand-red px-2 py-0.5 ml-2 rounded font-mono non-italic uppercase tracking-widest">CITIZEN PORTAL</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-[10px] text-text-secondary uppercase font-mono">{profile?.display_name}</p>
            <p className="text-[9px] text-brand-emerald font-mono uppercase">Status: Connected</p>
          </div>
          <button onClick={signOut} className="p-2 hover:bg-gray-800 rounded transition-colors text-text-secondary">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        <aside className="w-full sm:w-80 border-r border-gray-800 bg-bg-dark flex flex-col">
          <div className="p-4 border-b border-gray-800 flex gap-2">
            <button 
              onClick={() => setIsReporting(true)}
              className="flex-1 bg-brand-red hover:bg-red-700 text-white rounded font-bold uppercase text-[10px] py-3 flex items-center justify-center gap-2 tracking-widest transition-all"
            >
              Report Incident
            </button>
            <button 
              onClick={handleSOS}
              className="bg-black border border-brand-red text-brand-red hover:bg-brand-red hover:text-white rounded font-bold uppercase text-[10px] px-4 py-3 tracking-widest transition-all animate-pulse"
            >
              SOS
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <h2 className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest mb-2 flex items-center gap-2">
              <Bell className="w-3 h-3" /> My Incident History
            </h2>
            {reports.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <p className="text-xs uppercase font-mono opacity-50 italic">No reports found</p>
              </div>
            ) : (
              reports.map(report => (
                <div key={report.id} className={`p-3 rounded border border-gray-800 ${report.status === 'pending' ? 'bg-red-900/10 border-red-900/30' : 'bg-card-dark'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${priorityColors[report.priority]}`}>
                      {report.priority}
                    </span>
                    <span className="text-[9px] text-text-secondary font-mono">
                      {new Date(report.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white mb-1">{report.title}</h3>
                  {report.description && <p className="text-[10px] text-gray-500 line-clamp-2 italic mb-2">"{report.description}"</p>}
                  
                  {report.media_urls && report.media_urls.length > 0 && (
                    <div className="flex gap-1.5 mb-2 overflow-x-hidden">
                      {report.media_urls.slice(0, 3).map((url, idx) => (
                        <div key={idx} className="w-8 h-8 rounded bg-bg-dark border border-gray-800 overflow-hidden shrink-0">
                          <img src={url} className="w-full h-full object-cover opacity-50" alt="Evidence" />
                        </div>
                      ))}
                      {report.media_urls.length > 3 && (
                        <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-[8px] font-bold text-gray-400">
                          +{report.media_urls.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-3">
                    <span className={`text-[9px] font-bold uppercase tracking-tighter ${statusColors[report.status]}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                    <div className="flex gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${report.status === 'resolved' ? 'bg-brand-emerald' : 'bg-brand-red animate-pulse'}`}></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="flex-1 relative bg-[#111318]">
          <Map 
            center={location || [19.0760, 72.8777]}
            zoom={location ? 14 : 11}
            markers={reports.map(r => ({
              id: r.id,
              position: [r.latitude, r.longitude],
              title: r.title,
              type: r.type,
              color: r.priority === 'critical' ? 'red' : r.priority === 'high' ? 'orange' : 'blue'
            }))}
          />

          <AnimatePresence>
            {isReporting && (
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-y-0 right-0 w-full sm:w-96 bg-card-dark border-l border-gray-800 shadow-2xl z-[1000] p-6 flex flex-col"
              >
                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary">New incident report</h2>
                  <button onClick={() => setIsReporting(false)} className="text-text-secondary hover:text-white text-xs uppercase font-mono">Cancel</button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase font-mono block mb-2 tracking-widest">Incident Location</label>
                    <div className="p-3 bg-bg-dark border border-gray-800 rounded flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-brand-red" />
                      <span className="text-xs font-mono text-text-primary">
                        {location ? `${location[0].toFixed(4)}, ${location[1].toFixed(4)}` : "Detecting location..."}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-text-secondary uppercase font-mono block mb-2 tracking-widest">Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {types.map(t => (
                        <button 
                          key={t}
                          type="button"
                          onClick={() => setType(t as IncidentType)}
                          className={`flex flex-col items-center gap-2 py-3 rounded border uppercase font-bold tracking-tighter transition-all ${type === t ? 'bg-brand-red border-brand-red text-white' : 'bg-bg-dark border-gray-800 text-text-secondary hover:border-gray-700'}`}
                        >
                          {typeIcons[t as IncidentType]}
                          <span className="text-[8px]">{t}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-text-secondary uppercase font-mono block mb-2 tracking-widest">Short Title</label>
                    <input 
                      type="text" 
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Car Accident near Sector 4"
                      className="w-full bg-bg-dark border border-gray-800 rounded p-3 text-sm text-white focus:border-brand-red outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] text-text-secondary uppercase font-mono block tracking-widest">Situation Details</label>
                      <button 
                        type="button"
                        onClick={toggleListening}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[8px] font-bold uppercase transition-all ${
                          isListening 
                            ? 'bg-brand-red text-white animate-pulse' 
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="w-2.5 h-2.5" /> Stop Voice
                          </>
                        ) : (
                          <>
                            <Mic className="w-2.5 h-2.5" /> Voice-to-Text
                          </>
                        )}
                      </button>
                    </div>
                    <textarea 
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the incident, number of people involved, etc."
                      className="w-full bg-bg-dark border border-gray-800 rounded p-3 text-sm text-white focus:border-brand-red outline-none h-32 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-text-secondary uppercase font-mono block mb-2 tracking-widest">Priority</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['low', 'medium', 'high', 'critical'].map(p => (
                        <button 
                          key={p}
                          type="button"
                          onClick={() => setPriority(p as Priority)}
                          className={`text-[9px] py-2 rounded border uppercase font-bold tracking-tighter transition-all ${priority === p ? 'bg-white text-black border-white' : 'bg-bg-dark border-gray-800 text-text-secondary'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-text-secondary uppercase font-mono block mb-1 tracking-widest">Visual Evidence</label>
                      <div className="grid grid-cols-3 gap-2">
                        {mediaFiles.map((m, idx) => (
                          <div key={idx} className="relative aspect-square bg-bg-dark rounded overflow-hidden border border-gray-800">
                            {m.file.type.startsWith('video/') ? (
                              <video src={m.preview} className="w-full h-full object-cover" />
                            ) : (
                              <img src={m.preview} className="w-full h-full object-cover" alt="Preview" />
                            )}
                            <button 
                              type="button"
                              onClick={() => removeMedia(idx)}
                              className="absolute top-1 right-1 bg-black/70 p-1 rounded-full text-white hover:bg-brand-red transition-colors"
                            >
                              <AlertCircle className="w-3 h-3 rotate-45" />
                            </button>
                          </div>
                        ))}
                        <label className="aspect-square bg-gray-800/30 border border-dashed border-gray-700 rounded flex flex-col items-center justify-center cursor-pointer hover:border-brand-red transition-all group">
                          <Camera className="w-5 h-5 text-gray-600 group-hover:text-brand-red mb-1" />
                          <span className="text-[8px] text-gray-500 uppercase font-mono group-hover:text-white">Add Media</span>
                          <input 
                            type="file" 
                            multiple 
                            accept="image/*,video/*" 
                            className="hidden" 
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                    </div>

                    <button 
                      disabled={loading}
                      type="submit" 
                      className="w-full bg-brand-red text-white text-[10px] font-bold uppercase p-4 rounded flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-brand-red/20"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit Report
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
