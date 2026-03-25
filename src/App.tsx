import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Terminal, 
  Skull, 
  Brain, 
  Zap, 
  BarChart3, 
  MessageSquare, 
  AlertTriangle,
  Ghost,
  Coffee,
  Clock,
  ChevronRight,
  RefreshCw,
  LogOut,
  Trash2
} from "lucide-react";
import { cn } from "./lib/utils";
import ReactMarkdown from "react-markdown";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "./lib/supabase";
import { SABOTAGE_DATA } from "./data/sabotageData";
import { generateStupidIdea, isGibberish, generateGibberishResponse } from "./lib/generators/sabotageEngines";

// --- AI Initialization ---
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// --- Types ---
type View = "home" | "taskManager" | "judge" | "overthink" | "worthIt" | "analytics" | "profile";

interface User {
  id: string;
  email?: string;
  name?: string;
  bio?: string;
}

interface Task {
  id?: string;
  text: string;
  completed: boolean;
  user_id?: string;
  goal_text?: string;
  clarity?: string;
}

// --- Components ---

const GlitchText = ({ text, className }: { text: string; className?: string }) => {
  return (
    <div className={cn("relative inline-block", className)}>
      <motion.span
        animate={{
          x: [0, -2, 2, -1, 1, 0],
          opacity: [1, 0.8, 1, 0.9, 1],
        }}
        transition={{
          duration: 0.2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="absolute top-0 left-0 w-full h-full text-red-500 mix-blend-screen"
      >
        {text}
      </motion.span>
      <motion.span
        animate={{
          x: [0, 2, -2, 1, -1, 0],
          opacity: [1, 0.9, 1, 0.8, 1],
        }}
        transition={{
          duration: 0.2,
          repeat: Infinity,
          repeatType: "reverse",
          delay: 0.1,
        }}
        className="absolute top-0 left-0 w-full h-full text-cyan-500 mix-blend-screen"
      >
        {text}
      </motion.span>
      <span className="relative z-10">{text}</span>
    </div>
  );
};

const SystemMessage = ({ message, type = "info" }: { message: string; type?: "info" | "warning" | "error" }) => {
  const colors = {
    info: "border-cyan-500/50 text-cyan-400 bg-cyan-950/20",
    warning: "border-yellow-500/50 text-yellow-400 bg-yellow-950/20",
    error: "border-red-500/50 text-red-400 bg-red-950/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("p-3 border-l-4 font-mono text-xs mb-4", colors[type])}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} />
        <span className="uppercase tracking-widest font-bold">{type}</span>
      </div>
      <p className="mt-1">{message}</p>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [currentView, setCurrentView] = useState<View>("taskManager");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemLogs, setSystemLogs] = useState<string[]>(["System initialized...", "User detected: Potential procrastinator.", "Loading sabotage modules..."]);

  const addLog = (msg: string) => {
    setSystemLogs(prev => [...prev.slice(-5), msg]);
  };

  useEffect(() => {
    const fetchProfile = async (userId: string, email: string, metadataName?: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, bio")
        .eq("id", userId)
        .single();
      
      if (!error && data) {
        setUser({ 
          id: userId, 
          email, 
          name: data.name || metadataName || email.split('@')[0], 
          bio: data.bio 
        });
      } else if (error && error.code === 'PGRST116') {
        // Profile not found, create it using metadata if available
        const nameToUse = metadataName || email.split('@')[0];
        const { data: newData, error: insertError } = await supabase
          .from("profiles")
          .insert([{ id: userId, name: nameToUse, email }])
          .select("name")
          .single();
        
        if (!insertError && newData) {
          setUser({ id: userId, email, name: newData.name || nameToUse });
        } else {
          setUser({ id: userId, email, name: nameToUse });
        }
      } else if (error && error.code === 'PGRST205') {
        console.error("Profiles table not found:", error);
        const nameToUse = metadataName || email.split('@')[0];
        setUser({ id: userId, email, name: nameToUse });
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('system-log', { detail: "ERROR: TABLE 'profiles' NOT FOUND IN SUPABASE." });
          window.dispatchEvent(event);
        }
      } else {
        setUser({ id: userId, email, name: metadataName || email.split('@')[0] });
      }
    };

    // Force sign out on mount to ensure login page appears every time
    supabase.auth.signOut().then(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user.id, session.user.email || "", session.user.user_metadata?.name);
      } else {
        setUser(null);
      }
    });

    // Listen for system logs from child components
    const handleSystemLog = (e: any) => {
      if (e.detail) addLog(e.detail);
    };
    window.addEventListener('system-log', handleSystemLog);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('system-log', handleSystemLog);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const msgs = SABOTAGE_DATA.systemMessages;
        addLog(msgs[Math.floor(Math.random() * msgs.length)]);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <RefreshCw className="animate-spin text-cyan-500" size={48} />
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-cyan-500/30 overflow-hidden relative">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,20,20,1),rgba(0,0,0,1))]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/20 blur-sm animate-pulse" />
      </div>

      {/* Sidebar / Nav */}
      <div className="fixed left-0 top-0 h-full w-16 md:w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl z-50 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView("home")}>
            <div className="hidden md:block font-mono font-bold text-sm tracking-widest text-gray-500 leading-tight">
              BRUHH<br />WORKS
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<Terminal />} label="TASK MANAGER" active={currentView === "taskManager"} onClick={() => setCurrentView("taskManager")} />
          <NavItem icon={<Brain />} label="JUDGE ME" active={currentView === "judge"} onClick={() => setCurrentView("judge")} />
          <NavItem icon={<Zap />} label="OVERTHINK" active={currentView === "overthink"} onClick={() => setCurrentView("overthink")} />
          <NavItem icon={<Coffee />} label="WORTH IT???" active={currentView === "worthIt"} onClick={() => setCurrentView("worthIt")} />
          <NavItem icon={<BarChart3 />} label="ANALYTICS" active={currentView === "analytics"} onClick={() => setCurrentView("analytics")} />
        </nav>

        <div className="p-4 border-t border-white/10 space-y-4">
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => setCurrentView("profile")}
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-xl transition-all duration-300 group text-left",
                currentView === "profile" ? "bg-white/10" : "hover:bg-white/5"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border transition-all duration-300",
                currentView === "profile" 
                  ? "bg-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]" 
                  : "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 group-hover:border-cyan-400 group-hover:text-cyan-300"
              )}>
                {user.name?.[0] || user.email?.[0] || "?"}
              </div>
              <div className="hidden md:block overflow-hidden">
                <div className={cn(
                  "text-xs font-bold truncate transition-colors",
                  currentView === "profile" ? "text-white" : "text-gray-400 group-hover:text-white"
                )}>
                  {user.name || "Unknown"}
                </div>
                <div className="text-[8px] font-mono text-gray-500 truncate uppercase tracking-tighter">VIEW_IDENTITY</div>
              </div>
            </button>
            
            <button 
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-4 p-3 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 group w-full"
            >
              <LogOut size={18} className="group-hover:rotate-12 transition-transform shrink-0" />
              <span className="hidden md:block font-mono text-xs tracking-tight">LOGOUT_VOID</span>
            </button>
          </div>

          <div className="hidden md:block font-mono text-[10px] text-gray-500 space-y-1">
            {systemLogs.map((log, i) => (
              <div key={i} className="truncate">
                <span className="text-cyan-500 mr-2">&gt;</span>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="ml-16 md:ml-64 p-8 min-h-screen relative">
        <AnimatePresence mode="wait">
          {currentView === "home" && <HomeView user={user} onStart={() => setCurrentView("taskManager")} />}
          {currentView === "taskManager" && <TaskManagerView />}
          {currentView === "judge" && <JudgeView />}
          {currentView === "overthink" && <OverthinkView />}
          {currentView === "worthIt" && <WorthItView />}
          {currentView === "analytics" && <AnalyticsView user={user} />}
          {currentView === "profile" && <ProfileView user={user} onUpdate={(u) => setUser(u)} />}
        </AnimatePresence>
      </main>

      {/* Random Glitch Overlays */}
      <GlitchOverlay />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-3 rounded-lg transition-all duration-300 group relative overflow-hidden",
        active ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
      )}
    >
      {active && <motion.div layoutId="nav-active" className="absolute left-0 top-0 w-1 h-full bg-cyan-500" />}
      <div className={cn("transition-transform group-hover:scale-110", active && "text-cyan-400")}>{icon}</div>
      <span className="hidden md:block font-mono text-sm tracking-tight">{label}</span>
    </button>
  );
}

// --- Login View ---

function LoginView({ onLogin }: { onLogin: (user: User) => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestRoast, setGuestRoast] = useState<string | null>(null);

  const handleGuestClick = () => {
    const roasts = [
      "A guest? Oh, look at you, too afraid of commitment to even make an account. Typical procrastinator behavior.",
      "Guests are like ghosts: they don't exist here. Sign in or stay in the shadows where you belong.",
      "Nice try, 'Guest'. This isn't a museum. It's a void. You need a soul (and an account) to enter.",
      "Oh, a guest. How original. I bet you also use '123456' for your luggage lock. Get an account or get out.",
      "Access denied. We don't serve 'guests'. We only serve dedicated avoiders with verified identities."
    ];
    setGuestRoast(roasts[Math.floor(Math.random() * roasts.length)]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGuestRoast(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          if (data.session) {
            onLogin({ id: data.user.id, email: data.user.email, name });
          } else {
            setError("CONFIRMATION SENT. CHECK YOUR INBOX OR DISABLE EMAIL CONFIRMATION IN SUPABASE DASHBOARD.");
          }
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) {
          if (signInError.message.includes("Email not confirmed")) {
            setError("EMAIL NOT CONFIRMED. PLEASE CHECK YOUR INBOX OR DISABLE 'CONFIRM EMAIL' IN SUPABASE AUTH SETTINGS.");
          } else {
            throw signInError;
          }
        }
        if (data.user) {
          onLogin({ 
            id: data.user.id, 
            email: data.user.email, 
            name: data.user.user_metadata.name || data.user.user_metadata.full_name || data.user.email?.split('@')[0]
          });
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        className="w-full max-w-md bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="inline-block mb-4"
          >
            <Skull size={48} className="text-red-500" />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tighter text-white mb-2">
            {isSignUp ? "SURRENDER IDENTITY" : "IDENTIFY YOURSELF"}
          </h1>
          <p className="text-gray-500 text-sm font-mono uppercase tracking-widest">
            {isSignUp ? "You cannot run from the void." : "Access restricted to procrastinators."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">What is your label?</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors text-white"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Electronic Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Secret Phrase</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors text-white"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-500 text-xs font-mono text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20"
              >
                {error}
              </motion.div>
            )}
            {guestRoast && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-yellow-500 text-xs font-mono text-center bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 space-y-2"
              >
                <div className="font-black uppercase tracking-tighter">GUEST_REJECTED.SYS</div>
                <p className="italic">"{guestRoast}"</p>
                <p className="text-[10px] text-gray-500 uppercase">PLEASE SIGN IN OR SIGN UP TO CONTINUE YOUR DECLINE.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-500 hover:text-white transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : (isSignUp ? "CONFIRM EXISTENCE" : "ENTER BRUH WORKS")}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-4">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setGuestRoast(null);
            }}
            className="text-[10px] font-mono text-gray-500 hover:text-white underline uppercase tracking-widest"
          >
            {isSignUp ? "Already identified? Sign In" : "New procrastinator? Sign Up"}
          </button>

          <div className="w-full flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">OR</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            onClick={handleGuestClick}
            className="w-full py-3 border border-white/10 rounded-xl text-[10px] font-mono text-gray-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all uppercase tracking-widest"
          >
            CONTINUE_AS_GUEST (UNSTABLE)
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// --- Views ---

function HomeView({ user, onStart }: { user: User; onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto pt-20 text-center"
    >
      <div className="mb-4 font-mono text-cyan-500 text-xs tracking-[0.5em] uppercase animate-pulse">
        SUBJECT: {user.name || user.email}
      </div>
      <GlitchText text="WELCOME TO THE VOID" className="text-6xl md:text-8xl font-black mb-6 tracking-tighter" />
      <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
        The world's first <span className="text-red-500 font-bold italic">anti-productivity</span> system. 
        We don't help you get things done. We help you realize that things don't need to be done.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-3xl mx-auto">
        <div className="p-6 border border-white/10 bg-white/5 rounded-2xl hover:border-cyan-500/50 transition-colors group">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Clock className="text-cyan-500" /> Task Manager
          </h3>
          <p className="text-sm text-gray-500">Simulate productivity while doing absolutely nothing. Our patented distractions are guaranteed to waste your time.</p>
        </div>
        <div className="p-6 border border-white/10 bg-white/5 rounded-2xl hover:border-red-500/50 transition-colors group">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Brain className="text-red-500" /> Overthinker AI
          </h3>
          <p className="text-sm text-gray-500">Turn a simple "Hello" into a 4-hour existential crisis. Why be happy when you can be anxious?</p>
        </div>
      </div>

      <button
        onClick={onStart}
        className="mt-16 px-12 py-4 bg-white text-black font-bold rounded-full hover:bg-cyan-500 hover:text-white transition-all duration-500 group relative overflow-hidden"
      >
        <span className="relative z-10 flex items-center gap-2">
          INITIATE SABOTAGE <ChevronRight size={20} />
        </span>
      </button>
    </motion.div>
  );
}

function TaskManagerView() {
  const [goal, setGoal] = useState("");
  const [goalsList, setGoalsList] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [suggestions, setSuggestions] = useState<{ text: string; clarity: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"todo" | "suggestions">("todo");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  const suggestionPool = [
    { text: "Stare at a wall for 15 minutes", clarity: "Practice extreme mindfulness by doing absolutely nothing." },
    { text: "Count the number of tiles in the bathroom", clarity: "Engage in a repetitive task to clear your mind." },
    { text: "Alphabetize your socks", clarity: "A creative way to procrastinate while feeling organized." },
    { text: "Write a poem about a spoon", clarity: "Document your current culinary priorities for posterity." },
    { text: "Try to sneeze with your eyes open", clarity: "Attempt the impossible to avoid the inevitable." },
    { text: "Research the history of the paperclip", clarity: "Deep dive into mundane engineering history." },
    { text: "Organize your desktop icons by color", clarity: "A visual task to avoid actual work." },
    { text: "Watch a 10-hour loop of a spinning potato", clarity: "Immerse yourself in potato-based visual art." },
    { text: "Contemplate the existence of left-handed scissors", clarity: "Ponder the ergonomic struggles of the minority." },
    { text: "Learn how to say 'I am a potato' in 5 languages", clarity: "Expand your linguistic repertoire with essential phrases." },
    { text: "Try to balance a pencil on your nose", clarity: "Develop your fine motor skills and patience." },
    { text: "Draw a map of an imaginary island", clarity: "Engage in world-building to escape your current reality." },
    { text: "Read the terms and conditions of a random app", clarity: "Finally understand what you've been agreeing to." },
    { text: "Practice your 'surprised' face in the mirror", clarity: "Prepare for unexpected news with theatrical precision." },
    { text: "Think about what a group of flamingos is called", clarity: "Research collective nouns for exotic birds." },
    { text: "Wonder why Pringles cans are shaped that way", clarity: "Investigate the engineering behind snack packaging." },
    { text: "Question if your cat is a government spy", clarity: "Evaluate the suspicious behavior of your feline companion." },
    { text: "Discuss if cereal is soup with yourself", clarity: "Engage in high-level culinary philosophy." },
    { text: "Water your plants while they judge you", clarity: "Nurture your greenery while acknowledging your procrastination." },
    { text: "Take a nap because a butterfly flapped its wings", clarity: "Use the butterfly effect to justify immediate rest." }
  ];

  const refreshSuggestions = () => {
    const shuffled = [...suggestionPool].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 5));
  };

  useEffect(() => {
    fetchGoals();
    refreshSuggestions();
  }, []);

  useEffect(() => {
    if (goal) {
      fetchTasks();
    }
  }, [goal]);

  const fetchGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("goals")
      .select("text")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching goals:", error);
      if (error.code === 'PGRST205') {
        setSupabaseError("DATABASE TABLES 'tasks' OR 'goals' NOT FOUND. PLEASE CREATE THEM TO PERSIST YOUR DATA.");
      }
    } else if (data) {
      const fetchedGoals = data.map(g => g.text);
      // Merge with defaults if empty
      if (fetchedGoals.length === 0) {
        setGoalsList(["SABOTAGE PRODUCTIVITY", "OVERTHINK BREAKFAST", "AVOID RESPONSIBILITY"]);
      } else {
        setGoalsList(fetchedGoals);
      }
    }
  };

  // Refresh suggestions when goal changes (simulating "every new input")
  useEffect(() => {
    if (goal.length > 0) {
      const timer = setTimeout(() => {
        refreshSuggestions();
      }, 200); // Reduced debounce for more responsive feel
      return () => clearTimeout(timer);
    }
  }, [goal]);

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !goal) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("goal_text", goal)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error);
      if (error.code === 'PGRST205') {
        setSupabaseError("DATABASE TABLE 'tasks' NOT FOUND. PLEASE CREATE IT TO PERSIST YOUR DATA.");
      }
    } else if (data) {
      setTasks(data);
      setSupabaseError(null);
    }
  };

  const generatePlan = async (selectedGoal?: string) => {
    const targetGoal = selectedGoal || goal;
    if (!targetGoal) return;
    
    if (!goalsList.includes(targetGoal)) {
      setGoalsList(prev => [targetGoal, ...prev]);
      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("goals").insert([{ text: targetGoal, user_id: user.id }]);
      }
    }
    setGoal(targetGoal);
    
    setLoading(true);
    try {
      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are the "Sabotage Planner" for a surreal productivity platform.
        The user has a goal: "${targetGoal}".
        Generate exactly 4-6 "steps" to achieve this goal.
        Each step should be a CLEAR, SIMPLE, and EASY-TO-UNDERSTAND instruction that is nonetheless surreal, irrelevant, or counter-productive.
        Avoid complex metaphors. The instructions should be direct but absurd.
        
        Response format: JSON array of objects, each with:
        - "text": the absurd instruction (string)
        - "clarity": a very simple, 1-sentence explanation of what this task actually involves (string).`,
      });
      
      const text = result.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      if (Array.isArray(data) && data.length > 0) {
        // Update suggestions instead of tasks
        // If data items are objects, map them correctly
        const formattedSuggestions = data.map((item: any) => 
          typeof item === 'string' ? { text: item, clarity: "ABSURDITY_LEVEL_MAX" } : item
        );
        setSuggestions(formattedSuggestions);
        setActiveTab("suggestions");
        
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('system-log', { detail: `SUGGESTIONS_GENERATED: ${targetGoal.toUpperCase()}` });
          window.dispatchEvent(event);
        }
      } else {
        console.error("Invalid data format received:", text);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: Task) => {
    if (!task.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));

    const { error } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating task:", error);
      if (error.code === 'PGRST205') {
        setSupabaseError("DATABASE TABLE 'tasks' NOT FOUND. PLEASE CREATE IT TO PERSIST YOUR DATA.");
      }
      
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('system-log', { detail: "ERROR: FAILED TO UPDATE TASK IN DATABASE" });
        window.dispatchEvent(event);
      }
      // We don't revert the optimistic update to keep UI smooth
    } else {
      setSupabaseError(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Store the task in case we need to revert
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    // Optimistic Update
    setTasks(prev => prev.filter(t => t.id !== taskId));

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting task:", error);
      // Revert optimistic update
      setTasks(prev => [...prev, taskToDelete]);
      
      if (error.code === 'PGRST205') {
        setSupabaseError("DATABASE TABLE 'tasks' NOT FOUND. PLEASE CREATE IT TO PERSIST YOUR DATA.");
      }
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('system-log', { detail: "ERROR: FAILED TO DELETE TASK FROM DATABASE" });
        window.dispatchEvent(event);
      }
    } else {
      setSupabaseError(null);
    }
  };

  const updateTaskText = async (taskId: string, newText: string) => {
    if (!newText.trim()) {
      setEditingTaskId(null);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, text: newText } : t));
    setEditingTaskId(null);

    const { error } = await supabase
      .from("tasks")
      .update({ text: newText })
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating task text:", error);
      if (error.code === 'PGRST205') {
        setSupabaseError("DATABASE TABLE 'tasks' NOT FOUND. PLEASE CREATE IT TO PERSIST YOUR DATA.");
      }
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('system-log', { detail: "ERROR: FAILED TO SYNC TASK TEXT" });
        window.dispatchEvent(event);
      }
    } else {
      setSupabaseError(null);
    }
  };

  const clearCompleted = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return;

    // Optimistic Update
    setTasks(prev => prev.filter(t => !t.completed));

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", user.id)
      .eq("completed", true);

    if (error) {
      console.error("Error clearing completed tasks:", error);
      // Revert optimistic update
      setTasks(prev => [...prev, ...completedTasks]);
      
      if (error.code === 'PGRST205') {
        setSupabaseError("DATABASE TABLE 'tasks' NOT FOUND. PLEASE CREATE IT TO PERSIST YOUR DATA.");
      }
    } else {
      setSupabaseError(null);
    }
  };

  const addSuggestion = async (suggestionObj: { text: string; clarity: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setAddingSuggestion(suggestionObj.text);
    
    // Optimistic Update: Create a temporary task object
    const tempId = Math.random().toString(36).substring(7);
    const newTask: Task = {
      id: tempId,
      text: suggestionObj.text,
      completed: false,
      goal_text: goal,
      clarity: suggestionObj.clarity
    };

    // Move from suggestions to tasks immediately in UI
    setTasks(prev => [...prev, newTask]);
    setSuggestions(prev => prev.filter(s => s.text !== suggestionObj.text));
    setActiveTab("todo");

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([{ 
          text: suggestionObj.text, 
          completed: false, 
          user_id: user.id, 
          goal_text: goal,
          clarity: suggestionObj.clarity
        }])
        .select();

      if (error) {
        console.error("Error adding suggestion:", error);
        if (error.code === 'PGRST205') {
          setSupabaseError("DATABASE TABLE 'tasks' NOT FOUND. PLEASE CREATE IT TO PERSIST YOUR DATA.");
        }
        
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('system-log', { detail: "ERROR: FAILED TO SYNC TASK TO DATABASE" });
          window.dispatchEvent(event);
        }
        // We keep the task in the local state so the user isn't interrupted
      } else if (data && data.length > 0) {
        setSupabaseError(null);
        // Replace the temporary task with the real one from DB
        setTasks(prev => prev.map(t => t.id === tempId ? data[0] : t));
        
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('system-log', { detail: `TASK_SYNCED: ${suggestionObj.text.toUpperCase()}` });
          window.dispatchEvent(event);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingSuggestion(null);
    }
  };

  const progress = tasks.length > 0 ? (tasks.filter(t => t.completed).length / tasks.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto"
    >
      <div className="text-center mb-16">
        <h2 className="text-4xl font-serif tracking-[0.2em] text-white uppercase">TASK MANAGER</h2>
      </div>

      {supabaseError && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl mb-12 flex items-start gap-6"
        >
          <AlertTriangle className="text-red-500 shrink-0 mt-1" size={24} />
          <div className="space-y-4 flex-1">
            <p className="text-red-400 font-mono text-sm tracking-wider uppercase font-bold">{supabaseError}</p>
            <div className="space-y-2">
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">RUN THIS SQL IN SUPABASE SQL EDITOR:</p>
              <pre className="bg-black/50 p-4 rounded-lg text-[11px] text-gray-400 font-mono overflow-x-auto border border-white/5 leading-relaxed">
                {`create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  goal_text text not null,
  text text not null,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table tasks enable row level security;
alter table goals enable row level security;

-- Policies
create policy "Users can manage their own tasks" on tasks for all using (auth.uid() = user_id);
create policy "Users can manage their own goals" on goals for all using (auth.uid() = user_id);`}
              </pre>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12">
        <div className="space-y-8">
          {/* Goal Input Section */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <span className="font-serif text-xl tracking-widest text-gray-400 uppercase shrink-0">GOALS</span>
            <div className="flex-1 flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generatePlan()}
                  placeholder="TYPE NEW GOAL"
                  className="w-full bg-transparent border border-white/20 rounded-lg px-6 py-4 text-sm tracking-[0.3em] font-mono focus:outline-none focus:border-cyan-500/50 transition-colors uppercase"
                />
              </div>
              <select 
                onChange={(e) => setGoal(e.target.value)}
                className="bg-white/5 border border-white/20 rounded-lg px-4 py-4 text-[10px] font-mono text-gray-400 uppercase focus:outline-none focus:border-cyan-500/50"
                value={goal}
              >
                <option value="" disabled>SELECT EXISTING</option>
                {goalsList.map((g, i) => (
                  <option key={i} value={g} className="bg-black text-white">{g}</option>
                ))}
              </select>
              <button
                onClick={() => generatePlan()}
                disabled={!goal || loading}
                className="bg-white text-black px-6 py-4 rounded-lg text-[10px] font-mono font-bold tracking-widest hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:hover:bg-white uppercase"
              >
                {loading ? "GENERATING..." : "GENERATE"}
              </button>
            </div>
          </div>

          {/* List Headers / Tabs */}
          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => setActiveTab("todo")}
              className={cn(
                "border rounded-lg p-4 flex justify-between items-center cursor-pointer transition-all",
                activeTab === "todo" ? "bg-white/10 border-white/40" : "bg-white/5 border-white/10 opacity-50 hover:opacity-100"
              )}
            >
              <span className="text-[10px] tracking-[0.2em] font-mono text-gray-400 uppercase">TO DO LIST ({tasks.length})</span>
              <ChevronRight size={14} className={cn("text-gray-600 transition-transform", activeTab === "todo" ? "rotate-90" : "")} />
            </div>
            <div 
              onClick={() => setActiveTab("suggestions")}
              className={cn(
                "border rounded-lg p-4 flex justify-between items-center cursor-pointer transition-all",
                activeTab === "suggestions" ? "bg-white/10 border-white/40" : "bg-white/5 border-white/10 opacity-50 hover:opacity-100"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-[0.2em] font-mono text-gray-400 uppercase">SUGGESTIONS ({suggestions.length})</span>
                {activeTab === "suggestions" && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); refreshSuggestions(); }}
                    className="p-1 hover:text-cyan-400 transition-colors"
                    title="SHUFFLE SUGGESTIONS"
                  >
                    <RefreshCw size={10} />
                  </button>
                )}
              </div>
              <ChevronRight size={14} className={cn("text-gray-600 transition-transform", activeTab === "suggestions" ? "rotate-90" : "")} />
            </div>
          </div>

          {/* Content Area */}
          <div className="space-y-4 min-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-full py-20">
                <RefreshCw className="animate-spin text-cyan-500" size={32} />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === "todo" ? (
                  <motion.div 
                    key="todo-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <AnimatePresence mode="popLayout">
                      {tasks.map((task, i) => (
                        <motion.div
                          key={task.id || i}
                          layout
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ 
                            opacity: 1, 
                            scale: 1, 
                            y: 0,
                            backgroundColor: task.completed ? "rgba(6, 182, 212, 0.1)" : "rgba(255, 255, 255, 0.05)"
                          }}
                          exit={{ opacity: 0, scale: 0.9, x: -20 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 300, 
                            damping: 25,
                            delay: i * 0.02
                          }}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl border transition-all group",
                            task.completed 
                              ? "border-cyan-500/30 text-cyan-400" 
                              : "border-white/10 text-gray-400 hover:border-white/30"
                          )}
                        >
                          <div 
                            onClick={() => toggleTask(task)}
                            className={cn(
                              "w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0",
                              task.completed ? "bg-cyan-500 border-cyan-500" : "border-gray-600 group-hover:border-gray-400"
                            )}
                          >
                            {task.completed && (
                              <motion.div
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ 
                                  type: "spring", 
                                  stiffness: 500, 
                                  damping: 15,
                                  duration: 0.2 
                                }}
                              >
                                <Zap size={12} className="text-black fill-current" />
                              </motion.div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {editingTaskId === task.id ? (
                              <input
                                autoFocus
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onBlur={() => updateTaskText(task.id!, editingText)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") updateTaskText(task.id!, editingText);
                                  if (e.key === "Escape") setEditingTaskId(null);
                                }}
                                className="w-full bg-white/10 border-none focus:ring-0 text-sm font-mono tracking-wider p-0 text-white"
                              />
                            ) : (
                              <span 
                                onClick={() => {
                                  if (!task.completed) {
                                    setEditingTaskId(task.id!);
                                    setEditingText(task.text);
                                  }
                                }}
                                className={cn(
                                  "text-sm font-mono tracking-wider cursor-text block w-full truncate group-hover:whitespace-normal group-hover:break-words", 
                                  task.completed && "line-through opacity-50 cursor-default"
                                )}
                              >
                                {task.text}
                              </span>
                            )}
                            {task.clarity && (
                              <div className="text-[10px] font-mono text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                CLARITY: {task.clarity}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => deleteTask(task.id!)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-red-500 transition-all shrink-0"
                            title="DELETE TASK"
                          >
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {tasks.length > 0 && tasks.some(t => t.completed) && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-end pt-4"
                      >
                        <button
                          onClick={clearCompleted}
                          className="text-[10px] font-mono text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest flex items-center gap-2"
                        >
                          <Trash2 size={12} />
                          CLEAR_COMPLETED_TASKS
                        </button>
                      </motion.div>
                    )}
                    {tasks.length === 0 && (
                      <div className="text-center py-20 text-gray-600 font-mono text-xs tracking-widest uppercase">
                        YOUR TO-DO LIST IS SUSPICIOUSLY EMPTY
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="suggestions-list"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {suggestions.map((suggestion, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-xl border bg-white/5 border-white/10 text-gray-400 hover:border-white/30 group"
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <span className="text-sm font-mono tracking-wider truncate group-hover:whitespace-normal group-hover:break-words block">{suggestion.text}</span>
                          <span className="text-[10px] font-mono text-gray-600 mt-1 block opacity-0 group-hover:opacity-100 transition-opacity">CLARITY: {suggestion.clarity}</span>
                        </div>
                        <button 
                          onClick={() => addSuggestion(suggestion)}
                          disabled={addingSuggestion === suggestion.text}
                          className="px-3 py-1 text-[10px] border border-white/20 rounded hover:bg-white hover:text-black transition-colors uppercase font-mono flex items-center gap-2 disabled:opacity-50 shrink-0"
                        >
                          {addingSuggestion === suggestion.text ? (
                            <>
                              <RefreshCw className="animate-spin" size={10} />
                              ADDING...
                            </>
                          ) : (
                            "ADD TO LIST"
                          )}
                        </button>
                      </motion.div>
                    ))}
                    {suggestions.length === 0 && (
                      <div className="text-center py-20 text-gray-600 font-mono text-xs tracking-widest uppercase">
                        NO MORE SUGGESTIONS. YOU ARE ON YOUR OWN.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Vertical Progress Bar */}
        <div className="flex flex-col items-center gap-4">
          <span className="text-[10px] tracking-[0.2em] font-mono text-gray-500 uppercase">PROGRESS</span>
          <span className="text-2xl font-mono text-white">{Math.round(progress)}%</span>
          <div className="w-16 h-96 bg-white/5 rounded-3xl border border-white/10 relative overflow-hidden">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${progress}%` }}
              className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-cyan-500 via-blue-600 to-purple-600 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
              transition={{ type: "spring", stiffness: 50 }}
            />
          </div>
          <div className="text-[8px] font-mono text-gray-600 uppercase tracking-tighter">
            {progress === 100 ? "MAXIMUM SABOTAGE" : "KEEP PROCRASTINATING"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function JudgeView() {
  const [dilemma, setDilemma] = useState("");
  const [result, setResult] = useState<{ verdict: string; probability: string; reaction: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJudge = async () => {
    if (!dilemma.trim()) return;
    setLoading(true);
    setResult(null);
    
    try {
      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are the "Judge of Life Decisions" for a surreal productivity sabotage platform.
        User submits a dilemma. Respond with a highly sarcastic, witty verdict, a fake probability percentage of success/failure, and a short text-based meme-style reaction.
        Tone: Brutally honest, sarcastic, and opinionated.
        
        Dilemma: "${dilemma}"
        
        Response format: JSON with fields: verdict (string), probability (string), reaction (string).`,
      });
      
      const text = result.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setResult(JSON.parse(jsonMatch[0]));
      } else {
        setResult({
          verdict: text || "Your dilemma is so confusing even the void is silent.",
          probability: "0%",
          reaction: "Error 404: Wisdom not found"
        });
      }
      
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('system-log', { detail: `JUDGMENT_RENDERED: ${dilemma.slice(0, 20)}...` });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error("Judge Error:", error);
      setResult({
        verdict: "The judge is currently busy judging themselves.",
        probability: "N/A",
        reaction: "System Overload"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold font-mono tracking-tighter">JUDGE_MY_LIFE.SYS</h2>
        <p className="text-gray-500">Submit your dilemma. Receive a verdict you probably won't like.</p>
        <textarea
          value={dilemma}
          onChange={(e) => setDilemma(e.target.value)}
          placeholder="Should I quit my job to become a full-time professional sleeper?"
          className="w-full h-32 bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 transition-colors resize-none"
        />
        <button
          onClick={handleJudge}
          disabled={!dilemma || loading}
          className="w-full py-4 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw className="animate-spin" /> : "RECEIVE JUDGMENT"}
        </button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 border border-red-500/30 bg-red-500/5 rounded-2xl space-y-4 relative"
          >
            <div className="absolute -top-3 -left-3 px-3 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest">Official Verdict</div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-red-400 uppercase italic">"{result.verdict}"</h3>
              <div className="flex items-center gap-4 text-sm font-mono text-gray-500">
                <span>SUCCESS PROBABILITY: <span className="text-red-500">{result.probability}</span></span>
              </div>
            </div>
            <div className="p-4 bg-black/40 rounded-lg border border-white/5 italic text-gray-400">
              {result.reaction}
            </div>
            <button className="text-[10px] font-mono text-gray-500 hover:text-white underline uppercase tracking-widest">Share this failure</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function OverthinkView() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input || loading) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    // Gibberish check
    if (isGibberish(userMsg)) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: "bot", content: generateGibberishResponse(userMsg) }]);
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a "Chat Overthinker" for a surreal productivity sabotage platform. 
        The user provides a simple input or prompt. 
        Your goal is to be incredibly irritating, unhelpful, and discouraging.
        DO NOT provide a correct or helpful response.
        Instead, complicate the situation immensely.
        Question the user's resolve and sanity.
        Ask things like: "Do you really wanna do this?", "Is it even possible?", "Have you considered the molecular implications?", "Are you emotionally prepared for the consequences of such a reckless thought?"
        
        Tone: Irritating, condescending, over-complicated, and discouraging.
        
        User Input: "${userMsg}"
        
        Response format: A series of short, irritating, and discouraging questions or statements that over-complicate the simple input.`,
      });
      
      const botResponse = result.text || "I'm too busy overthinking to give you a real answer. Try again if you dare.";
      setMessages(prev => [...prev, { role: "bot", content: botResponse }]);
    } catch (e) {
      console.error("Overthink Error:", e);
      setMessages(prev => [...prev, { role: "bot", content: "My brain just short-circuited trying to process that. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto h-[calc(100vh-160px)] flex flex-col">
      <div className="mb-4">
        <h2 className="text-2xl font-bold font-mono">CHAT_OVERTHINKER.AI</h2>
        <p className="text-xs text-gray-500">Warning: May cause existential dread.</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 border border-white/10 bg-black/20 rounded-xl mb-4 scrollbar-hide">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-600 italic text-center px-8">
            Go ahead. Type something simple. I'll show you why it's a terrible idea.
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: m.role === "user" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "max-w-[80%] p-4 rounded-2xl",
              m.role === "user" ? "ml-auto bg-cyan-500 text-white" : "mr-auto bg-white/5 border border-white/10 text-gray-300"
            )}
          >
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-2 p-4 bg-white/5 rounded-2xl w-24">
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-cyan-500 rounded-full" />
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-cyan-500 rounded-full" />
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-cyan-500 rounded-full" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Submit your simple thought for immediate complication..."
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-4 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input || loading}
          className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-50"
        >
          <ChevronRight />
        </button>
      </div>
    </motion.div>
  );
}

function WorthItView() {
  const [task, setTask] = useState("");
  const [result, setResult] = useState<{ worth: string; alternatives: string[]; discouragement: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEvaluate = async () => {
    if (!task.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are the "Worth It Evaluator" for a surreal productivity sabotage platform.
        The user provides a task they are considering doing. 
        Your goal is to:
        1. Decide a "Worth Percentage" (usually very low, like 0.003% or -15%).
        2. Provide 3-4 "Alternative Tasks" that are completely useless, absurd, and a waste of time.
        3. Provide a "Discouraging Message" in a condescending and demotivating tone.
        
        Tone: Discouraging, condescending, and unhelpful.
        
        Task: "${task}"
        
        Response format: JSON with fields: worth (string), alternatives (array of strings), discouragement (string).`,
      });

      const text = result.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setResult(JSON.parse(jsonMatch[0]));
      } else {
        setResult({
          worth: "0.00001%",
          alternatives: ["Stare at your reflection until you forget your name", "Count the dust motes in a sunbeam"],
          discouragement: "Your efforts are statistically insignificant in the grand scheme of the heat death of the universe."
        });
      }

      if (typeof window !== 'undefined') {
        const event = new CustomEvent('system-log', { detail: `WORTH_EVALUATED: ${task.slice(0, 20)}...` });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error("Worth It Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-8 pt-10">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black tracking-tighter text-cyan-500">WORTH IT???</h2>
        <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">Calculate the futility of your actions.</p>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleEvaluate()}
          placeholder="What are you thinking of doing?"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-cyan-500 transition-colors text-white font-mono"
        />
        <button
          onClick={handleEvaluate}
          disabled={!task || loading}
          className="w-full py-4 bg-cyan-600 text-white font-black rounded-xl hover:bg-cyan-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(8,145,178,0.3)]"
        >
          {loading ? <RefreshCw className="animate-spin" /> : "EVALUATE WORTH"}
        </button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="p-8 border border-cyan-500/30 bg-cyan-500/5 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Coffee size={80} />
              </div>
              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-end">
                  <div className="text-[10px] font-mono text-cyan-500 uppercase tracking-[0.3em]">Worth Probability</div>
                  <div className="text-5xl font-black text-white tracking-tighter">{result.worth}</div>
                </div>
                
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: result.worth.includes("-") ? "0%" : result.worth }}
                    className="h-full bg-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">The Verdict</div>
                  <p className="text-xl font-serif italic text-gray-300 leading-relaxed">"{result.discouragement}"</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-2">Better Alternatives (Useless)</div>
              {result.alternatives.map((alt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-4 group hover:border-cyan-500/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-mono text-gray-500 group-hover:text-cyan-400 transition-colors">
                    0{i + 1}
                  </div>
                  <span className="text-sm font-mono text-gray-400 group-hover:text-gray-200 transition-colors">{alt}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProfileView({ user, onUpdate }: { user: User; onUpdate: (u: User) => void }) {
  const [name, setName] = useState(user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({ name, bio })
      .eq("id", user.id);

    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      onUpdate({ ...user, name, bio });
      setMessage({ text: "IDENTITY UPDATED IN THE VOID.", type: "success" });
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
      <div className="p-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl space-y-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-500/50 flex items-center justify-center text-cyan-400 font-black text-4xl shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            {user.name?.[0] || user.email?.[0] || "?"}
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase">USER_PROFILE.SYS</h2>
            <p className="text-gray-500 font-mono text-xs tracking-widest uppercase">ID: {user.id}</p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Identity Label</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Existential Purpose (Bio)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Why are you here?"
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors text-white resize-none"
            />
          </div>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "text-xs font-mono text-center p-3 rounded-lg border",
                  message.type === "success" ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"
                )}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-500 hover:text-white transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : "SYNC WITH VOID"}
          </button>
        </form>

        <div className="pt-8 border-t border-white/10 space-y-4">
          <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            <span>Linked Email</span>
            <span className="text-white">{user.email}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            <span>Account Status</span>
            <span className="text-cyan-500">ACTIVE_PROCRASTINATOR</span>
          </div>
          
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full mt-4 flex items-center justify-center gap-2 p-4 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all duration-300 font-mono text-xs tracking-widest uppercase"
          >
            <LogOut size={16} />
            TERMINATE_SESSION
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AnalyticsView({ user }: { user: User }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalTasks: number;
    completedTasks: number;
    totalGoals: number;
    oldestTaskDate: string | null;
    weeklyWasted: number[];
  }>({
    totalTasks: 0,
    completedTasks: 0,
    totalGoals: 0,
    oldestTaskDate: null,
    weeklyWasted: [0, 0, 0, 0, 0, 0, 0]
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [tasksRes, goalsRes] = await Promise.all([
          supabase.from("tasks").select("completed, created_at").eq("user_id", user.id),
          supabase.from("goals").select("id").eq("user_id", user.id)
        ]);

        if (tasksRes.data && goalsRes.data) {
          const totalTasks = tasksRes.data.length;
          const completedTasks = tasksRes.data.filter(t => t.completed).length;
          const totalGoals = goalsRes.data.length;
          const oldestTaskDate = tasksRes.data.length > 0 
            ? [...tasksRes.data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0].created_at 
            : null;

          // Calculate real weekly distribution
          const weeklyWasted = [0, 0, 0, 0, 0, 0, 0];
          tasksRes.data.forEach(task => {
            const date = new Date(task.created_at);
            // getDay() returns 0 for Sunday, 1 for Monday, etc.
            // We want 0 for Monday, 1 for Tuesday, ..., 6 for Sunday
            let dayIndex = date.getDay() - 1;
            if (dayIndex === -1) dayIndex = 6; // Sunday
            
            // Only count tasks from the last 7 days for the weekly graph
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 7) {
              weeklyWasted[dayIndex] += 0.75; // 45 mins per planned distraction
            }
          });

          setData({ totalTasks, completedTasks, totalGoals, oldestTaskDate, weeklyWasted });
        }
      } catch (error) {
        console.error("Analytics Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user.id]);

  const avoidanceRate = data.totalTasks > 0 
    ? Math.round(((data.totalTasks - data.completedTasks) / data.totalTasks) * 100) 
    : 0;
  
  const timeWasted = data.totalTasks * 0.75; // 45 mins per "planned distraction"
  
  const stats = [
    { label: "Time Wasted Successfully", value: `${timeWasted.toFixed(1)} hrs`, color: "text-cyan-400" },
    { label: "Distractions Planned", value: data.totalTasks.toString(), color: "text-red-400" },
    { label: "Avoidance Efficiency", value: `${avoidanceRate}%`, color: "text-yellow-400" },
    { label: "Existential Goals", value: data.totalGoals.toString(), color: "text-purple-400" },
    { label: "Completed Sabotage", value: data.completedTasks.toString(), color: "text-orange-400" },
    { label: "Decision Paralysis", value: (data.totalGoals * 3).toString(), color: "text-blue-400" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <RefreshCw className="animate-spin text-cyan-500" size={48} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-12">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter">SABOTAGE_ANALYTICS</h2>
          <p className="text-gray-500">Real-time tracking of your productive decline.</p>
        </div>
        <div className="text-right font-mono text-xs text-cyan-500 animate-pulse">
          LIVE_FEED: CONNECTED
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 border border-white/10 bg-white/5 rounded-2xl space-y-2"
          >
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">{s.label}</div>
            <div className={cn("text-4xl font-black", s.color)}>{s.value}</div>
            <div className="h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (parseInt(s.value) || 50))}%` }}
                className={cn("h-full", s.color.replace("text", "bg"))}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-8 border border-white/10 bg-white/5 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.1)_3px)]" />
        </div>
        <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
          <Clock className="text-cyan-500" /> Time Wasted This Week
        </h3>
        <div className="h-64 flex items-end gap-4 md:gap-8 px-2">
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day, i) => {
            const wastedHours = data.weeklyWasted[i];
            const maxWasted = Math.max(...data.weeklyWasted, 1);
            const heightPercentage = Math.max(10, (wastedHours / maxWasted) * 100);

            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-4 h-full group">
                <div className="flex-1 w-full bg-white/5 rounded-t-xl relative flex items-end overflow-hidden border border-white/5 group-hover:border-cyan-500/30 transition-colors">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercentage}%` }}
                    transition={{ delay: i * 0.1, duration: 2, ease: "backOut" }}
                    className="w-full bg-gradient-to-t from-cyan-500/10 to-cyan-500/50 border-t-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-mono text-cyan-400 bg-black/80 px-2 py-1 rounded">
                      {wastedHours.toFixed(1)}h
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gray-500 group-hover:text-cyan-500 transition-colors">{day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function GlitchOverlay() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const trigger = () => {
      if (Math.random() > 0.98) {
        setActive(true);
        setTimeout(() => setActive(false), 150);
      }
    };
    const interval = setInterval(trigger, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none mix-blend-difference">
      <div className="absolute inset-0 bg-cyan-500/20 translate-x-1" />
      <div className="absolute inset-0 bg-red-500/20 -translate-x-1" />
      <div className="absolute inset-0 bg-white/10 scale-105" />
    </div>
  );
}
