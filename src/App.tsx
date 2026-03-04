/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  BookOpen, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  History, 
  Scroll,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Library,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  Calendar,
  UserPlus,
  GraduationCap,
  SortAsc,
  SortDesc,
  HelpCircle,
  RotateCcw
} from "lucide-react";
import Markdown from 'react-markdown';

// --- Types ---

enum HadithStatus {
  SAHIH = "Sahih (Authentic)",
  HASAN = "Hasan (Good)",
  DAIF = "Da'if (Weak)",
  MAWDU = "Mawdu' (Fabricated)",
  UNKNOWN = "Unknown/Inconclusive"
}

interface Narrator {
  id?: number;
  name: string;
  reliability: string;
  biography: string;
  status: string;
  era: string;
  birth?: string;
  death?: string;
  teachers?: string | string[];
  students?: string | string[];
}

interface ScholarView {
  scholarName: string;
  commentary: string;
  relevance: string;
}

interface AnalysisResult {
  verdict: HadithStatus;
  summary: string;
  narrators: Narrator[];
  chainAnalysis: string;
  detailedExplanation: string;
  scholarViews: ScholarView[];
}

interface FAQ {
  question: string;
  answer: string;
}

type View = 'verifier' | 'encyclopedia' | 'faq';
type SortField = 'name' | 'era' | 'status' | 'death';
type SortOrder = 'asc' | 'desc';

// --- Components ---

const getStatusConfig = (status: string) => {
  const lower = status.toLowerCase();
  if (lower.includes("thiqah")) return { 
    color: "bg-emerald-50 text-emerald-700 border-emerald-200", 
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    short: "Thiqah",
    full: "Thiqah (Trustworthy)"
  };
  if (lower.includes("saduq")) return { 
    color: "bg-blue-50 text-blue-700 border-blue-200", 
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    short: "Saduq",
    full: "Saduq (Truthful)"
  };
  if (lower.includes("da'if") || lower.includes("weak")) return { 
    color: "bg-amber-50 text-amber-700 border-amber-200", 
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    short: "Da'if",
    full: "Da'if (Weak)"
  };
  if (lower.includes("kadhhab") || lower.includes("liar")) return { 
    color: "bg-red-50 text-red-700 border-red-200", 
    icon: <XCircle className="w-3.5 h-3.5" />,
    short: "Kadhhab",
    full: "Kadhhab (Liar)"
  };
  if (lower.includes("majhul") || lower.includes("unknown")) return { 
    color: "bg-gray-50 text-gray-700 border-gray-200", 
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    short: "Majhul",
    full: "Majhul (Unknown)"
  };
  return { 
    color: "bg-stone-50 text-stone-700 border-stone-200", 
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    short: status.split(' ')[0],
    full: status
  };
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = getStatusConfig(status);
  return (
    <div className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-2 shadow-sm ${config.color}`}>
      {config.icon}
      {config.short}
    </div>
  );
};

const ReliabilityScale = () => {
  const eliteRanks = [
    { term: "Amir al-Mu'minin", meaning: "Commander of the Faithful", desc: "The absolute highest rank in Hadith science (e.g., Al-Bukhari).", color: "text-gold", bg: "bg-gold/5", border: "border-gold/20" },
    { term: "Imam / Sayyid", meaning: "Leading Authority", desc: "A master scholar whose reliability and leadership are universally accepted.", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
    { term: "Hafiz / Hakim", meaning: "Master of Sciences", desc: "One who has memorized 100,000+ Hadiths with their full chains.", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
  ];

  const standardGrades = [
    { term: "Thiqah", score: "10/10", meaning: "Trustworthy", desc: "Highest level of reliability, precision, and integrity.", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    { term: "Saduq", score: "8/10", meaning: "Truthful", desc: "Reliable and honest, but may have minor lapses in memory.", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { term: "Da'if", score: "4/10", meaning: "Weak", desc: "Significant issues in memory, precision, or character.", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
    { term: "Majhul", score: "2/10", meaning: "Unknown", desc: "Identity or reliability is not established by scholars.", color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-100" },
    { term: "Kadhhab", score: "0/10", meaning: "Liar", desc: "Fabricator of Hadith or severely compromised integrity.", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
  ];

  return (
    <div className="bg-white rounded-3xl border border-ink/5 shadow-sm overflow-hidden mb-12">
      <div className="bg-parchment/30 px-8 py-4 border-b border-ink/5 flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gold" /> Reliability & Scholarly Ranks
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink/30">Classical Standards</span>
      </div>

      {/* Elite Ranks */}
      <div className="p-6 border-b border-ink/5 bg-gold/5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gold/60 mb-4 text-center">Elite Scholarly Titles</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {eliteRanks.map((r) => (
            <div key={r.term} className={`p-4 rounded-2xl bg-white border ${r.border} flex flex-col items-center text-center space-y-2 shadow-sm`}>
              <div className={`font-serif font-bold ${r.color}`}>{r.term}</div>
              <div className="text-[10px] font-bold uppercase tracking-tighter text-ink/40">{r.meaning}</div>
              <p className="text-[11px] text-ink/60 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Standard Grades */}
      <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-ink/5">
        {standardGrades.map((g) => (
          <div key={g.term} className="p-6 flex flex-col items-center text-center space-y-3 hover:bg-parchment/10 transition-colors">
            <div className={`w-12 h-12 rounded-2xl ${g.bg} ${g.border} border flex items-center justify-center font-bold ${g.color} text-sm shadow-inner`}>
              {g.score}
            </div>
            <div>
              <div className={`font-bold text-sm ${g.color}`}>{g.term}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-ink/30">{g.meaning}</div>
            </div>
            <p className="text-[11px] text-ink/60 leading-relaxed">{g.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<View>('verifier');
  const [isnad, setIsnad] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Encyclopedia State
  const [searchQuery, setSearchQuery] = useState('');
  const [localNarrators, setLocalNarrators] = useState<Narrator[]>([]);
  const [narratorCount, setNarratorCount] = useState(0);
  const [aiNarratorResult, setAiNarratorResult] = useState<Narrator | null>(null);
  const [aiSearching, setAiSearching] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // FAQ State
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Modal State
  const [selectedNarrator, setSelectedNarrator] = useState<Narrator | null>(null);
  const [showScale, setShowScale] = useState(false);

  // Autopilot State
  const [isAutopilotRunning, setIsAutopilotRunning] = useState(false);
  const [isAutopilotInitializing, setIsAutopilotInitializing] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [autopilotLog, setAutopilotLog] = useState<string[]>([]);
  const [autopilotQueue, setAutopilotQueue] = useState<string[]>([]);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setNarratorCount(data.count);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNarrators = async () => {
    try {
      console.log("Fetching narrators from database...");
      const res = await fetch(`/api/narrators?q=${searchQuery}&sort=${sortField}&order=${sortOrder}`);
      const data = await res.json();
      console.log(`Fetched ${data.length} narrators.`);
      setLocalNarrators(data);
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  };

  const fetchFaqs = async () => {
    try {
      const res = await fetch('/api/faqs');
      const data = await res.json();
      setFaqs(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Rate limit countdown timer
  useEffect(() => {
    if (retryCountdown <= 0) {
      setIsRateLimited(false);
      return;
    }
    const timer = setInterval(() => {
      setRetryCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCountdown]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const callAiWithRetry = async (fn: () => Promise<any>, maxRetries = 3): Promise<any> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        const errorStr = err.message || JSON.stringify(err);
        
        if (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED")) {
          // Extract wait time if possible, default to 30s
          const match = errorStr.match(/retry in ([\d.]+)s/);
          const waitSeconds = match ? Math.ceil(parseFloat(match[1])) : (30 * Math.pow(2, i));
          
          setIsRateLimited(true);
          setRetryCountdown(waitSeconds);
          setAutopilotLog(prev => [`Rate limited. Waiting ${waitSeconds}s...`, ...prev.slice(0, 4)]);
          
          await sleep(waitSeconds * 1000);
          continue;
        }
        
        // For other errors, wait a bit and retry
        await sleep(2000 * Math.pow(2, i));
      }
    }
    throw lastError;
  };

  useEffect(() => {
    fetchNarrators();
    fetchStats();
    fetchFaqs();
  }, [searchQuery, sortField, sortOrder]);

  // Autopilot Queue Processor
  useEffect(() => {
    let timeout: any;
    
    const processNext = async () => {
      if (!isAutopilotRunning || autopilotQueue.length === 0 || isRateLimited) return;
      
      const nextName = autopilotQueue[0];
      
      // Skip if already in local list
      if (localNarrators.some(n => n.name.toLowerCase() === nextName.toLowerCase())) {
        setAutopilotLog(prev => [`- Skipping (Exists): ${nextName}`, ...prev.slice(0, 4)]);
        setAutopilotQueue(prev => prev.slice(1));
        return;
      }

      setAutopilotLog(prev => [`Researching: ${nextName}...`, ...prev.slice(0, 4)]);
      
      try {
        const data = await performResearch(nextName);
        if (data) {
          await syncNarrator(data);
          fetchNarrators();
          fetchStats();
          setAutopilotLog(prev => [`✓ Added: ${nextName}`, ...prev.slice(0, 4)]);
        }
      } catch (err) {
        setAutopilotLog(prev => [`✗ Error: ${nextName}`, ...prev.slice(0, 4)]);
      } finally {
        setAutopilotQueue(prev => prev.slice(1));
      }
    };

    if (isAutopilotRunning && autopilotQueue.length > 0 && !isRateLimited) {
      timeout = setTimeout(processNext, 3000);
    } else if (isAutopilotRunning && autopilotQueue.length === 0 && !isAutopilotInitializing) {
      setIsAutopilotRunning(false);
      setAutopilotLog(prev => ["Batch complete.", ...prev.slice(0, 4)]);
    }
    
    return () => clearTimeout(timeout);
  }, [isAutopilotRunning, autopilotQueue, isRateLimited]);

  const syncNarrator = async (narrator: Narrator): Promise<Narrator> => {
    try {
      const res = await fetch('/api/narrators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(narrator)
      });
      const data = await res.json();
      fetchStats();
      return { ...narrator, id: data.id };
    } catch (err) {
      console.error("Failed to sync narrator:", err);
      return narrator;
    }
  };

  const analyzeIsnad = async () => {
    if (!isnad.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await callAiWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following Hadith Isnad (chain of narrators). 
        
        CRITICAL: You must maintain the EXACT sequence of the chain as provided in the input, starting from the source (e.g., the author of the book) and ending with the final narrator (e.g., the Companion or the Prophet).
        
        For each narrator in the chain, you must perform deep biographical research using classical sources (Tahdhib al-Tahdhib, Mizan al-I'tidal, etc.).
        
        Identify each narrator, evaluate their reliability (Jarh wa Ta'dil), check for continuity in the chain, and provide an overall authenticity grade based on classical Hadith science.

        IMPORTANT: Additionally, research and include specific views, considerations, or comments from famous Imams and scholars (e.g., Imam Bukhari, Imam Muslim, Imam Ahmad, Ibn Hajar, Al-Dhahabi, etc.) regarding this specific Hadith or its chain. If an Imam has a comment that is even slightly related or provides context, include it separately. Mention if the comment is directly about this Hadith, about the Isnad, or general related commentary.

        DOUBLE-CHECK: Before finalizing the response, verify the following:
        1. Are the narrators in the correct chronological and sequential order?
        2. Is the reliability assessment consistent with the majority of classical scholars?
        3. Are the birth/death dates logical within the chain (e.g., teacher must be older than student)?
        4. Have you included all relevant scholarly views as requested?

Isnad: "${isnad}"`,
        config: {
          systemInstruction: "You are an elite Muhaddith. Use classical sources. Your research for each narrator must include their full scholarly name, era, birth/death years, major teachers/students, and a detailed reliability assessment. You must also provide a section for scholarly views from major Imams.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verdict: { type: Type.STRING },
              summary: { type: Type.STRING },
              narrators: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    reliability: { type: Type.STRING },
                    biography: { type: Type.STRING },
                    status: { type: Type.STRING },
                    era: { type: Type.STRING },
                    birth: { type: Type.STRING },
                    death: { type: Type.STRING },
                    teachers: { type: Type.ARRAY, items: { type: Type.STRING } },
                    students: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["name", "reliability", "biography", "status", "era", "birth", "death", "teachers", "students"]
                }
              },
              scholarViews: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    scholarName: { type: Type.STRING },
                    commentary: { type: Type.STRING },
                    relevance: { type: Type.STRING }
                  },
                  required: ["scholarName", "commentary", "relevance"]
                }
              },
              chainAnalysis: { type: Type.STRING },
              detailedExplanation: { type: Type.STRING }
            },
            required: ["verdict", "summary", "narrators", "scholarViews", "chainAnalysis", "detailedExplanation"]
          }
        }
      }));

      const data = JSON.parse(response.text || '{}') as AnalysisResult;
      
      // Map AI-fetched narrators to unique IDs by syncing with backend
      const syncedNarrators = await Promise.all(data.narrators.map(n => syncNarrator(n)));
      setResult({ ...data, narrators: syncedNarrators });
      fetchNarrators(); // Update encyclopedia with new narrators
    } catch (err) {
      setError("An error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const performResearch = async (name: string): Promise<Narrator | null> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await callAiWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Perform a deep, scholarly biographical and reliability research for the Hadith narrator: "${name}". 
        
        You must consult classical sources like Tahdhib al-Tahdhib, Mizan al-I'tidal, and Al-Jarh wa al-Ta'dil.
        
        Provide:
        1. Full scholarly name and lineage.
        2. Precise era (e.g., Tabi'un, Tabi' al-Tabi'un).
        3. Specific reliability status (Thiqah, Saduq, Da'if, Kadhhab, etc.) with a detailed explanation of why scholars gave this verdict.
        4. A comprehensive biography including their place of residence and scholarly journey.
        5. Birth and death years in AH (Hijri).
        6. A list of at least 3-5 major teachers and 3-5 major students.`,
        config: {
          systemInstruction: "You are an elite Muhaddith and expert in Ilm al-Rijal. Your research must be exhaustive and academic. Do not provide generic information. If specific dates are unknown, provide the century or era context.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              status: { type: Type.STRING },
              reliability: { type: Type.STRING },
              biography: { type: Type.STRING },
              era: { type: Type.STRING },
              birth: { type: Type.STRING },
              death: { type: Type.STRING },
              teachers: { type: Type.ARRAY, items: { type: Type.STRING } },
              students: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "status", "reliability", "biography", "era", "birth", "death", "teachers", "students"]
          }
        }
      }));

      return JSON.parse(response.text || '{}') as Narrator;
    } catch (err) {
      console.error("Research failed for:", name, err);
      return null;
    }
  };

  const searchNarratorAI = async () => {
    if (!searchQuery.trim()) return;
    setAiSearching(true);
    setAiNarratorResult(null);
    
    try {
      const data = await performResearch(searchQuery);
      if (data) {
        const synced = await syncNarrator(data);
        setAiNarratorResult(synced);
        fetchNarrators();
        fetchStats();
      } else {
        setError("Failed to research narrator.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to research narrator. Please try again.");
    } finally {
      setAiSearching(false);
    }
  };

  const startAutopilot = async () => {
    if (isAutopilotRunning || isAutopilotInitializing) {
      setIsAutopilotRunning(false);
      setIsAutopilotInitializing(false);
      setAutopilotQueue([]);
      return;
    }

    setIsAutopilotInitializing(true);
    setIsAutopilotRunning(true);
    setAutopilotLog(["Initializing Harvester..."]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Get existing names to avoid duplicates
      const existingNames = localNarrators.map(n => n.name).slice(0, 50).join(", ");
      
      const response = await callAiWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `List 15 prominent Hadith narrators (full names) from the Tabi'un or Tabi' al-Tabi'un eras. Focus on those NOT in this list: [${existingNames}]. Return only a JSON array of strings.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }));
      
      const names = JSON.parse(response.text || '[]') as string[];
      setAutopilotQueue(names);
      setAutopilotLog(prev => [`Found ${names.length} targets. Starting...`, ...prev]);
    } catch (err) {
      console.error(err);
      setIsAutopilotRunning(false);
      setAutopilotLog(prev => ["Failed to initialize.", ...prev]);
    } finally {
      setIsAutopilotInitializing(false);
    }
  };

  const clearDatabase = async () => {
    try {
      await fetch('/api/narrators', { method: 'DELETE' });
      fetchNarrators();
      fetchStats();
      setAutopilotLog(["Database cleared."]);
      setIsConfirmingClear(false);
    } catch (err) {
      console.error("Failed to clear database:", err);
    }
  };

  const deleteNarrator = async (id: number) => {
    if (!confirm("Are you sure you want to delete this narrator?")) return;
    try {
      await fetch(`/api/narrators/${id}`, { method: 'DELETE' });
      fetchNarrators();
      fetchStats();
      if (selectedNarrator?.id === id) setSelectedNarrator(null);
    } catch (err) {
      console.error("Failed to delete narrator:", err);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="min-h-screen bg-parchment selection:bg-gold/20 flex flex-col">
      {/* Narrator Detail Modal */}
      <AnimatePresence>
        {selectedNarrator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-ink/40 backdrop-blur-sm"
            onClick={() => setSelectedNarrator(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-ink/5 flex justify-between items-start bg-parchment/30">
                <div>
                  <h2 className="font-serif text-3xl font-bold mb-2">{selectedNarrator.name}</h2>
                  <div className="flex items-center gap-4 text-xs font-bold text-gold uppercase tracking-widest">
                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {selectedNarrator.era}</div>
                    {(selectedNarrator.birth || selectedNarrator.death) && (
                      <div className="flex items-center gap-1">
                        {selectedNarrator.birth && `b. ${selectedNarrator.birth}`}
                        {selectedNarrator.birth && selectedNarrator.death && ' - '}
                        {selectedNarrator.death && `d. ${selectedNarrator.death}`}
                      </div>
                    )}
                  </div>
                </div>
                <StatusBadge status={selectedNarrator.status} />
              </div>
              
              <div className="p-8 overflow-y-auto space-y-8">
                <div className="flex items-center gap-3 p-4 bg-parchment/50 rounded-2xl border border-ink/5">
                  <div className={`p-2 rounded-lg ${getStatusConfig(selectedNarrator.status).color}`}>
                    {getStatusConfig(selectedNarrator.status).icon}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-ink/30">Reliability Status</div>
                    <div className="text-sm font-bold text-ink">{getStatusConfig(selectedNarrator.status).full}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-ink/30 mb-4 flex items-center gap-2">
                    <Info className="w-3 h-3" /> Assessment Details
                  </h4>
                  <p className="text-lg font-serif italic text-ink/80 leading-relaxed">
                    "{selectedNarrator.reliability}"
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-ink/30 mb-4">Biography</h4>
                  <p className="text-ink/70 leading-relaxed">
                    {selectedNarrator.biography}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-ink/5">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-ink/30 mb-4 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" /> Teachers
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(typeof selectedNarrator.teachers === 'string' ? JSON.parse(selectedNarrator.teachers) : selectedNarrator.teachers || []).map((t: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-parchment rounded-full text-xs text-ink/60 border border-ink/5">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-ink/30 mb-4 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" /> Students
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(typeof selectedNarrator.students === 'string' ? JSON.parse(selectedNarrator.students) : selectedNarrator.students || []).map((s: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-parchment rounded-full text-xs text-ink/60 border border-ink/5">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-ink/5 bg-parchment/10 flex justify-between items-center">
                {selectedNarrator.id && (
                  <button
                    onClick={() => deleteNarrator(selectedNarrator.id!)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-full text-xs font-bold transition-colors flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Delete Narrator
                  </button>
                )}
                <button
                  onClick={() => setSelectedNarrator(null)}
                  className="px-6 py-2 bg-ink text-parchment rounded-full text-sm font-bold hover:bg-ink/90 transition-colors"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-parchment/80 backdrop-blur-md border-b border-ink/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scroll className="w-6 h-6 text-gold" />
            <span className="font-serif text-xl font-bold tracking-tight">Isnad Verifier</span>
          </div>
          <div className="flex bg-ink/5 p-1 rounded-full">
            <button
              onClick={() => setView('verifier')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${view === 'verifier' ? 'bg-white text-ink shadow-sm' : 'text-ink/40 hover:text-ink/60'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              Verifier
            </button>
            <button
              onClick={() => setView('encyclopedia')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${view === 'encyclopedia' ? 'bg-white text-ink shadow-sm' : 'text-ink/40 hover:text-ink/60'}`}
            >
              <Library className="w-4 h-4" />
              Encyclopedia
            </button>
            <button
              onClick={() => setView('faq')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${view === 'faq' ? 'bg-white text-ink shadow-sm' : 'text-ink/40 hover:text-ink/60'}`}
            >
              <HelpCircle className="w-4 h-4" />
              FAQ
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <AnimatePresence mode="wait">
          {view === 'verifier' && (
            <motion.div key="verifier" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <header className="text-center mb-12">
                <h1 className="font-serif text-5xl font-bold text-ink mb-4 tracking-tight">Verify a Chain</h1>
                <p className="text-ink/60 font-serif italic text-lg max-w-2xl mx-auto">Analyze the authenticity of Hadith chains using AI-powered narrator research.</p>
              </header>

              <section className="mb-16">
                <div className="bg-white rounded-3xl shadow-xl shadow-ink/5 border border-ink/5 p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-6">
                    <BookOpen className="w-6 h-6 text-gold" />
                    <h2 className="font-serif text-2xl font-semibold">Enter Hadith Chain</h2>
                  </div>
                  <textarea
                    value={isnad}
                    onChange={(e) => setIsnad(e.target.value)}
                    placeholder="e.g., Malik from Nafi' from Ibn Umar..."
                    className="w-full h-40 p-6 rounded-2xl bg-parchment/50 border border-ink/10 focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all font-serif text-xl resize-none placeholder:text-ink/30"
                  />
                  <div className="mt-6 flex justify-end">
                    <button onClick={analyzeIsnad} disabled={loading || !isnad.trim()} className="px-8 py-4 bg-ink text-parchment rounded-full font-medium transition-all hover:scale-105 flex items-center gap-3 disabled:opacity-50">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                      Verify Isnad
                    </button>
                  </div>
                </div>
              </section>

              {result && (
                <div className="space-y-12">
                  <div className="bg-white rounded-3xl shadow-xl shadow-ink/5 border border-ink/5 overflow-hidden">
                    <div className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 border-b border-ink/5">
                      <div className="p-6 bg-parchment rounded-2xl">
                        {result.verdict.includes("Sahih") ? <CheckCircle2 className="w-8 h-8 text-emerald-600" /> : <AlertTriangle className="w-8 h-8 text-amber-600" />}
                      </div>
                      <div className="text-center md:text-left flex-1">
                        <div className="text-sm font-bold tracking-widest text-gold uppercase mb-1">Final Verdict</div>
                        <h3 className="font-serif text-4xl font-bold mb-2">{result.verdict}</h3>
                        <p className="text-ink/60 text-lg">{result.summary}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center justify-between px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold">
                          {result.narrators.length}
                        </div>
                        <div>
                          <h3 className="font-serif text-xl font-bold">Sequential Chain of Narrators</h3>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-ink/30">From Source to Final Narrator</p>
                        </div>
                      </div>
                    </div>

                    <div className="relative space-y-12 before:absolute before:left-[27px] before:top-8 before:bottom-8 before:w-0.5 before:bg-gold/20">
                      {result.narrators.map((narrator, idx) => (
                        <div key={idx} className="relative pl-16 group">
                          {/* Sequence Number / Indicator */}
                          <div className="absolute left-0 top-0 w-14 h-14 rounded-2xl bg-white border-2 border-gold/20 flex items-center justify-center font-serif text-xl font-bold text-gold shadow-sm group-hover:border-gold group-hover:bg-gold group-hover:text-white transition-all z-10">
                            {idx + 1}
                          </div>

                          {/* Narrator Card */}
                          <div
                            onClick={() => setSelectedNarrator(narrator)}
                            className="bg-white p-8 rounded-3xl border border-ink/5 shadow-lg shadow-ink/5 cursor-pointer hover:shadow-xl transition-all group active:scale-[0.98] relative"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                              <h4 className="font-serif text-2xl font-bold group-hover:text-gold transition-colors">{narrator.name}</h4>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={narrator.status} />
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-[10px] font-bold text-gold uppercase tracking-widest mb-4">
                              <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {narrator.era}</div>
                              {narrator.death && <div className="flex items-center gap-1">d. {narrator.death}</div>}
                            </div>

                            <p className="text-sm text-ink/50 mb-4 font-medium italic">"{narrator.reliability}"</p>
                            <p className="text-ink/70 text-sm leading-relaxed line-clamp-2">{narrator.biography}</p>
                            
                            <div className="mt-6 flex justify-between items-center">
                              <div className="flex -space-x-2">
                                {(typeof narrator.teachers === 'string' ? JSON.parse(narrator.teachers) : narrator.teachers || []).slice(0, 3).map((_: any, i: number) => (
                                  <div key={i} className="w-6 h-6 rounded-full bg-parchment border border-white flex items-center justify-center">
                                    <UserPlus className="w-3 h-3 text-ink/20" />
                                  </div>
                                ))}
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                View Full Profile <ChevronDown className="w-3 h-3 -rotate-90" />
                              </span>
                            </div>

                            {/* Connection Arrow */}
                            {idx < result.narrators.length - 1 && (
                              <div className="absolute -bottom-10 left-[-45px] md:left-[-45px] text-gold/30 animate-bounce">
                                <ChevronDown className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.scholarViews && result.scholarViews.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="w-6 h-6 text-gold" />
                        <h2 className="font-serif text-2xl font-semibold">Scholarly Commentary & Imam Views</h2>
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                        {result.scholarViews.map((view, idx) => (
                          <div key={idx} className="bg-white p-8 rounded-3xl border border-ink/5 shadow-lg shadow-ink/5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                                  <GraduationCap className="w-5 h-5 text-gold" />
                                </div>
                                <div>
                                  <h4 className="font-serif text-xl font-bold text-ink">{view.scholarName}</h4>
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-gold">{view.relevance}</div>
                                </div>
                              </div>
                            </div>
                            <div className="prose prose-sm max-w-none text-ink/70 leading-relaxed font-serif italic">
                              <Markdown>{view.commentary}</Markdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {view === 'encyclopedia' && (
            <motion.div key="encyclopedia" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <header className="text-center mb-12">
                <h1 className="font-serif text-5xl font-bold text-ink mb-4 tracking-tight">Narrator Encyclopedia</h1>
                <p className="text-ink/60 font-serif italic text-lg max-w-2xl mx-auto">Explore biographies and reliability assessments of Hadith narrators.</p>
                <div className="mt-6 flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-ink/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-ink/40 border border-ink/5">
                      <Library className="w-3.5 h-3.5" /> {narratorCount} Narrators in Database
                    </div>
                    <button 
                      onClick={() => { fetchNarrators(); fetchStats(); }}
                      className="p-1.5 bg-ink/5 hover:bg-ink/10 text-ink/40 rounded-full transition-colors border border-ink/5"
                      title="Refresh Database"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setShowScale(!showScale)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${showScale ? 'bg-gold text-white border-gold' : 'bg-ink/5 text-ink/40 border-ink/5 hover:bg-ink/10'}`}
                    >
                      {showScale ? 'Hide Scale' : 'Show Grading Scale'}
                    </button>
                  </div>
                  <div className="text-[10px] text-ink/30 italic">Data is persisted in the local SQLite database.</div>
                  {narratorCount > 0 && (
                    <div className="flex items-center justify-center min-h-[40px]">
                      {isConfirmingClear ? (
                        <div className="flex items-center gap-3 bg-red-50 p-1 pr-1 pl-4 rounded-full border border-red-100 animate-in fade-in zoom-in-95">
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Confirm Wipe?</span>
                          <div className="flex gap-1">
                            <button 
                              onClick={clearDatabase}
                              className="px-4 py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase rounded-full hover:bg-red-700 transition-all shadow-sm active:scale-95"
                            >
                              Yes, Clear
                            </button>
                            <button 
                              onClick={() => setIsConfirmingClear(false)}
                              className="px-4 py-1.5 bg-white text-ink text-[10px] font-bold uppercase rounded-full border border-ink/10 hover:bg-ink/5 transition-all active:scale-95"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => setIsConfirmingClear(true)}
                          className="px-5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border border-red-100 flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95"
                        >
                          <XCircle className="w-4 h-4" /> Clear All Data
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </header>

              <AnimatePresence>
                {showScale && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <ReliabilityScale />
                  </motion.div>
                )}
              </AnimatePresence>

              <section className="mb-12 space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                  <div className="relative flex-1 max-w-2xl w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/30" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search database..."
                      className="w-full pl-14 pr-32 py-5 rounded-full bg-white border border-ink/10 shadow-lg shadow-ink/5 focus:ring-2 focus:ring-gold/30 outline-none font-serif text-lg"
                    />
                    <button onClick={searchNarratorAI} disabled={aiSearching || !searchQuery.trim()} className="absolute right-2 top-2 bottom-2 px-6 bg-ink text-parchment rounded-full text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                      {aiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      AI Research
                    </button>
                  </div>

                  <button 
                    onClick={startAutopilot}
                    disabled={isAutopilotInitializing}
                    className={`px-8 py-5 rounded-full font-bold text-sm flex items-center gap-3 transition-all shadow-lg ${isAutopilotRunning || isAutopilotInitializing ? 'bg-emerald-600 text-white animate-pulse' : 'bg-gold text-ink hover:bg-gold/90'}`}
                  >
                    {isAutopilotRunning || isAutopilotInitializing ? <History className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
                    {isAutopilotInitializing ? 'Initializing...' : (isAutopilotRunning ? 'Stop Autopilot' : 'Start Autopilot')}
                  </button>
                </div>

                {isAutopilotRunning && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="max-w-2xl mx-auto bg-ink/5 rounded-2xl p-4 border border-ink/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40">Autopilot Log</span>
                        {isRateLimited && (
                          <span className="text-[10px] font-bold text-amber-600 animate-pulse uppercase tracking-widest flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Rate Limited: Retrying in {retryCountdown}s
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">{autopilotQueue.length} remaining</span>
                    </div>
                    <div className="space-y-1">
                      {autopilotLog.map((log, i) => (
                        <div key={i} className="text-xs font-mono text-ink/60 flex items-center gap-2">
                          <div className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-emerald-500 animate-ping' : 'bg-ink/20'}`} />
                          {log}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="flex flex-wrap justify-center gap-4">
                  {(['name', 'era', 'status', 'death'] as SortField[]).map(field => (
                    <button
                      key={field}
                      onClick={() => toggleSort(field)}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-2 ${sortField === field ? 'bg-ink text-parchment border-ink' : 'bg-white text-ink/60 border-ink/10 hover:border-ink/30'}`}
                    >
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                      {sortField === field && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                    </button>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {localNarrators.map((narrator, idx) => (
                  <motion.div
                    key={idx}
                    layout
                    onClick={() => setSelectedNarrator(narrator)}
                    className="bg-white p-8 rounded-3xl border border-ink/5 shadow-lg hover:shadow-xl transition-all group cursor-pointer active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-serif text-xl font-bold group-hover:text-gold transition-colors">{narrator.name}</h3>
                      <StatusBadge status={narrator.status} />
                    </div>
                    
                    <div className="flex items-center gap-4 text-[10px] font-bold text-gold uppercase tracking-widest mb-4">
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {narrator.era}</div>
                      {narrator.death && <div className="flex items-center gap-1">d. {narrator.death}</div>}
                    </div>

                    <p className="text-ink/60 text-sm line-clamp-3 mb-6">{narrator.biography}</p>
                    
                    <div className="space-y-4 pt-4 border-t border-ink/5">
                      {narrator.teachers && (
                        <div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-ink/30 uppercase mb-1"><GraduationCap className="w-3 h-3" /> Teachers</div>
                          <p className="text-[10px] text-ink/60 truncate">{typeof narrator.teachers === 'string' ? JSON.parse(narrator.teachers).join(', ') : narrator.teachers.join(', ')}</p>
                        </div>
                      )}
                      {narrator.students && (
                        <div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-ink/30 uppercase mb-1"><UserPlus className="w-3 h-3" /> Students</div>
                          <p className="text-[10px] text-ink/60 truncate">{typeof narrator.students === 'string' ? JSON.parse(narrator.students).join(', ') : narrator.students.join(', ')}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        View Profile <ChevronDown className="w-3 h-3 -rotate-90" />
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'faq' && (
            <motion.div key="faq" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl mx-auto">
              <header className="text-center mb-12">
                <h1 className="font-serif text-5xl font-bold text-ink mb-4 tracking-tight">Frequently Asked Questions</h1>
                <p className="text-ink/60 font-serif italic text-lg">Learn more about the science of Hadith and how to use this tool.</p>
              </header>

              <div className="space-y-4">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full p-6 text-left flex items-center justify-between hover:bg-ink/5 transition-colors"
                    >
                      <span className="font-serif text-xl font-bold">{faq.question}</span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openFaq === idx && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="p-6 pt-0 text-ink/60 leading-relaxed border-t border-ink/5 bg-parchment/30">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-ink/10 py-12 px-6 text-center text-ink/40">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Scroll className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Isnad Verifier</span>
          </div>
          <p className="text-xs">Powered by Gemini AI & Classical Hadith Sciences</p>
        </div>
      </footer>
    </div>
  );
}
