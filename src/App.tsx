/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Menu, X, Play, Mic, Waves, CheckCircle2, AlertCircle, MessageSquare, Sparkles, Send, Loader2, LogOut, User as UserIcon, Plus, ExternalLink, Globe, MapPin, ShieldCheck, LayoutDashboard, Database, FileText, Settings, ChevronRight, Download, BookOpen } from "lucide-react";
import { useState, useEffect, ChangeEvent, useRef, FormEvent, useMemo } from "react";
import * as gemini from "./services/geminiService";
import { joinWaitlist, auth, db, googleProvider, getPosts, addPost, getFeeds, addFeed, getToolkit, addToolkitItem, getMarketIntel, addMarketIntel, getWaitlist } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { OnboardingFlow } from "./components/OnboardingFlow";
import ReactMarkdown from 'react-markdown';
import * as d3 from 'd3';

const MarketMap = ({ data }: { data: any[] }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 400;
    
    // Simple projection for Tri-state and Jamaica
    // This is a mock visualization since we don't have real geojson for these specific local areas easily
    // We'll use a bubble chart style map
    
    const simulation = d3.forceSimulation(data)
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .force("collide", d3.forceCollide(60));

    const g = svg.append("g");

    const nodes = g.selectAll(".node")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(d3.drag<any, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    nodes.append("circle")
      .attr("r", 50)
      .attr("fill", d => d.region === 'Jamaica' ? '#009b3a' : '#ffb800')
      .attr("fill-opacity", 0.2)
      .attr("stroke", d => d.region === 'Jamaica' ? '#fed100' : '#2d1b14')
      .attr("stroke-width", 2);

    nodes.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "#f5f2ed")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .text(d => d.title);

    simulation.on("tick", () => {
      nodes.attr("transform", d => `translate(${d.x},${d.y})`);
    });

  }, [data]);

  return (
    <div className="relative w-full aspect-[2/1] bg-espresso/40 rounded-xl border border-white/5 overflow-hidden">
      <div className="absolute top-4 left-4 z-10">
        <h4 className="text-xs font-bold uppercase tracking-widest text-amber-custom mb-1">Market Intelligence</h4>
        <p className="text-[10px] text-cream/40">Interactive Signal Map: Tri-State & Jamaica</p>
      </div>
      <svg ref={svgRef} viewBox="0 0 800 400" className="w-full h-full" />
      <div className="absolute bottom-4 right-4 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-custom" />
          <span className="text-[10px] text-cream/60">US Tri-State</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#009b3a]" />
          <span className="text-[10px] text-cream/60">Jamaica</span>
        </div>
      </div>
    </div>
  );
};

const ToolkitCard = ({ item, isAdmin }: { item: any, isAdmin: boolean }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-espresso/40 p-6 rounded-xl border border-white/5 hover:border-amber-custom/30 transition-all group"
  >
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] font-bold uppercase tracking-tighter px-2 py-1 bg-amber-custom/10 text-amber-custom rounded">
        {item.type}
      </span>
      <Download size={16} className="text-cream/20 group-hover:text-amber-custom transition-colors cursor-pointer" />
    </div>
    <h3 className="text-lg font-display font-bold text-cream mb-2">{item.title}</h3>
    <p className="text-sm text-cream/60 mb-4 line-clamp-2">{item.description}</p>
    <button className="text-xs font-bold text-amber-custom flex items-center gap-2 group-hover:gap-3 transition-all">
      ACCESS RESOURCE <ArrowRight size={14} />
    </button>
  </motion.div>
);

const SignalToStartup = ({ onAnalyze, isLoading, analysis }: { onAnalyze: (e: any) => void, isLoading: boolean, analysis: any }) => (
  <div className="bg-espresso/60 p-8 rounded-2xl border border-white/10">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-amber-custom/20 rounded-lg">
        <Sparkles className="text-amber-custom" size={24} />
      </div>
      <div>
        <h3 className="text-xl font-display font-bold text-cream">Signal to Startup</h3>
        <p className="text-sm text-cream/40">AI-powered market opportunity analysis</p>
      </div>
    </div>

    <form onSubmit={onAnalyze} className="space-y-4 mb-8">
      <div className="relative">
        <textarea 
          placeholder="Paste a news headline, policy link, or market observation..."
          className="w-full bg-espresso border border-white/10 rounded-xl p-4 text-sm text-cream placeholder:text-cream/20 focus:border-amber-custom outline-none transition-all min-h-[120px]"
          name="signal"
        />
      </div>
      <button 
        type="submit"
        disabled={isLoading}
        className="w-full bg-amber-custom text-espresso font-bold py-3 rounded-xl hover:bg-cream transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Sparkles size={18} /> ANALYZE SIGNAL</>}
      </button>
    </form>

    <AnimatePresence>
      {analysis && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <h4 className="text-xs font-bold text-amber-custom uppercase tracking-widest mb-2">The Signal</h4>
              <p className="text-sm text-cream/80">{analysis.signal}</p>
            </div>
            <div className="p-4 bg-amber-custom/10 rounded-xl border border-amber-custom/20">
              <h4 className="text-xs font-bold text-amber-custom uppercase tracking-widest mb-2">The Opportunity</h4>
              <p className="text-sm text-cream/80">{analysis.opportunity}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <h4 className="text-xs font-bold text-amber-custom uppercase tracking-widest mb-2">The First Step</h4>
              <p className="text-sm text-cream/80">{analysis.firstStep}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const AdminDashboard = ({ waitlist, onClose }: { waitlist: any[], onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-espresso/95 backdrop-blur-xl"
  >
    <div className="w-full max-w-5xl bg-espresso border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-amber-custom" />
          <h2 className="text-2xl font-display font-bold text-cream">Founder's Dashboard</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xs font-bold text-cream/40 uppercase tracking-widest mb-1">Waitlist Total</p>
            <p className="text-3xl font-display font-bold text-amber-custom">{waitlist.length}</p>
          </div>
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xs font-bold text-cream/40 uppercase tracking-widest mb-1">Active Ventures</p>
            <p className="text-3xl font-display font-bold text-amber-custom">3</p>
          </div>
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xs font-bold text-cream/40 uppercase tracking-widest mb-1">Toolkit Items</p>
            <p className="text-3xl font-display font-bold text-amber-custom">12</p>
          </div>
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xs font-bold text-cream/40 uppercase tracking-widest mb-1">Market Signals</p>
            <p className="text-3xl font-display font-bold text-amber-custom">48</p>
          </div>
        </div>

        <h3 className="text-lg font-display font-bold text-cream mb-6 flex items-center gap-2">
          <UserIcon size={20} className="text-amber-custom" /> Recent Waitlist Signups
        </h3>
        
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-cream/40 uppercase text-[10px] font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Business</th>
                <th className="px-6 py-4">Market</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {waitlist.map((entry, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-cream">{entry.name}</td>
                  <td className="px-6 py-4 text-cream/60">{entry.email}</td>
                  <td className="px-6 py-4 text-cream/60">{entry.business}</td>
                  <td className="px-6 py-4 text-cream/60">{entry.market || 'N/A'}</td>
                  <td className="px-6 py-4 text-cream/40">{entry.createdAt?.toDate().toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </motion.div>
);
const Navbar = ({ user, onLogin, onLogout, isAdmin, setShowAdminDashboard }: { user: User | null, onLogin: () => void, onLogout: () => void, isAdmin: boolean, setShowAdminDashboard: (show: boolean) => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <nav className="fixed top-0 left-0 w-full z-50">
      {/* Main Navbar Bar */}
      <div className="relative z-50 px-6 py-6 md:px-12 bg-espresso/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-custom rounded-sm flex items-center justify-center">
              <span className="text-espresso font-display font-extrabold text-xl">E</span>
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-cream">
              Entrep<span className="text-amber-custom italic">AI</span>neur
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#ventures" className="text-sm font-medium hover:text-amber-custom transition-colors">Ventures</a>
            <a href="#insights" className="text-sm font-medium hover:text-amber-custom transition-colors">Insights</a>
            <a href="#about" className="text-sm font-medium hover:text-amber-custom transition-colors">About</a>
            {isAdmin && (
              <button 
                onClick={() => setShowAdminDashboard(true)}
                className="text-amber-custom hover:text-cream transition-colors flex items-center gap-2"
                title="Admin Dashboard"
              >
                <LayoutDashboard size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Admin</span>
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  <img src={user.photoURL || ""} alt="" className="w-5 h-5 rounded-full" />
                  <span className="text-xs font-medium text-cream/70">{user.displayName?.split(' ')[0]}</span>
                </div>
                <button 
                  onClick={onLogout}
                  className="text-cream/40 hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="bg-cream text-espresso px-5 py-2 rounded-full text-sm font-bold hover:bg-amber-custom transition-all duration-300"
              >
                Login
              </button>
            )}
            <a 
              href="#waitlist" 
              className="border border-amber-custom/30 text-amber-custom px-5 py-2 rounded-full text-sm font-bold hover:bg-amber-custom hover:text-espresso transition-all duration-300"
            >
              Waitlist
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-cream p-2 -mr-2 z-50" 
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Overlay & Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-espresso/90 backdrop-blur-sm z-40 md:hidden"
            />
            
            {/* Slide-down Menu */}
            <motion.div 
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 w-full bg-espresso border-b border-white/10 pt-24 pb-12 px-6 z-40 md:hidden shadow-2xl"
            >
              <div className="flex flex-col gap-8">
                <a 
                  href="#ventures" 
                  className="text-3xl font-display font-bold text-cream hover:text-amber-custom transition-colors" 
                  onClick={() => setIsOpen(false)}
                >
                  Ventures
                </a>
                <a 
                  href="#insights" 
                  className="text-3xl font-display font-bold text-cream hover:text-amber-custom transition-colors" 
                  onClick={() => setIsOpen(false)}
                >
                  Insights
                </a>
                <a 
                  href="#about" 
                  className="text-3xl font-display font-bold text-cream hover:text-amber-custom transition-colors" 
                  onClick={() => setIsOpen(false)}
                >
                  About
                </a>
                <a 
                  href="#waitlist" 
                  className="text-3xl font-display font-bold text-amber-custom" 
                  onClick={() => setIsOpen(false)}
                >
                  Join Waitlist
                </a>

                {user ? (
                  <div className="mt-4 flex flex-col gap-4">
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                      <img src={user.photoURL || ""} alt="" className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-bold text-cream">{user.displayName}</p>
                        <p className="text-xs text-cream/40">{user.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        onLogout();
                        setIsOpen(false);
                      }}
                      className="flex items-center justify-center gap-2 bg-red-500/10 text-red-400 py-4 rounded-2xl font-bold border border-red-500/20"
                    >
                      <LogOut size={20} /> Logout
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      onLogin();
                      setIsOpen(false);
                    }}
                    className="bg-cream text-espresso py-4 rounded-2xl font-bold text-xl hover:bg-amber-custom transition-all"
                  >
                    Login to EntrepAIneur
                  </button>
                )}
                
                <div className="mt-8 pt-8 border-t border-white/10">
                  <p className="text-sm text-cream/50 font-medium mb-4 uppercase tracking-widest">Connect with us</p>
                  <div className="flex gap-6">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-cream hover:bg-amber-custom hover:text-espresso transition-all">
                      <Send size={18} />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-cream hover:bg-amber-custom hover:text-espresso transition-all">
                      <MessageSquare size={18} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

interface Feed {
  id: string;
  url: string;
  name: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [posts, setPosts] = useState<any[]>([]);
  const [feeds, setFeeds] = useState<any[]>([]);
  const [rssItems, setRssItems] = useState<any[]>([]);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showFeedForm, setShowFeedForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', excerpt: '', author: 'Dain Russell', image: '', tags: [] });
  const [newFeed, setNewFeed] = useState({ url: '', name: '' });
  const [selectedPost, setSelectedPost] = useState<any>(null);

  // Phase 1: Toolkit States
  const [toolkitItems, setToolkitItems] = useState<any[]>([]);
  const [showToolkitForm, setShowToolkitForm] = useState(false);
  const [newToolkitItem, setNewToolkitItem] = useState({ title: '', description: '', type: 'Prompt', content: '' });

  // Phase 3: Market Intel States
  const [marketIntel, setMarketIntel] = useState<any[]>([]);
  const [showIntelForm, setShowIntelForm] = useState(false);
  const [newIntel, setNewIntel] = useState({ region: 'Tri-state', title: '', description: '', coordinates: { lat: 38.4192, lng: -82.4452 } });

  // Phase 4: Admin Dashboard States
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([]);

  // Phase 5: Signal to Startup States
  const [signalInput, setSignalInput] = useState("");
  const [signalAnalysis, setSignalAnalysis] = useState<any>(null);
  const [isSignalLoading, setIsSignalLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        setIsAdmin(currentUser.email === "dain.russell@gmail.com");
        const docRef = doc(db, 'profiles', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
          setShowOnboarding(false);
        } else {
          setShowOnboarding(true);
        }
      } else {
        setProfile(null);
        setShowOnboarding(false);
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchInsights = async () => {
      setIsInsightsLoading(true);
      try {
        const fetchedPosts = await getPosts();
        if (fetchedPosts) setPosts(fetchedPosts);

        const fetchedFeeds = await getFeeds() as Feed[] | undefined;
        if (fetchedFeeds) {
          setFeeds(fetchedFeeds);
          const allRssItems: any[] = [];
          for (const feed of fetchedFeeds) {
            try {
              const response = await fetch(`/api/rss?url=${encodeURIComponent(feed.url)}`);
              if (response.ok) {
                const data = await response.json();
                const items = data.items.slice(0, 3).map((item: any) => ({
                  ...item,
                  feedName: feed.name,
                  type: 'rss'
                }));
                allRssItems.push(...items);
              }
            } catch (err) {
              console.error(`Failed to fetch RSS for ${feed.name}:`, err);
            }
          }
          setRssItems(allRssItems);
        }

        const fetchedToolkit = await getToolkit();
        if (fetchedToolkit) setToolkitItems(fetchedToolkit);

        const fetchedIntel = await getMarketIntel();
        if (fetchedIntel) setMarketIntel(fetchedIntel);

        if (isAdmin) {
          const fetchedWaitlist = await getWaitlist();
          if (fetchedWaitlist) setWaitlistEntries(fetchedWaitlist);
        }
      } catch (error) {
        console.error("Error fetching insights:", error);
      } finally {
        setIsInsightsLoading(false);
      }
    };

    fetchInsights();
  }, [isAdmin]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handlePostSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await addPost(newPost);
      setShowPostForm(false);
      setNewPost({ title: '', content: '', excerpt: '', author: 'Dain Russell', image: '', tags: [] });
      // Refresh posts
      const fetchedPosts = await getPosts();
      if (fetchedPosts) setPosts(fetchedPosts);
    } catch (error) {
      console.error("Failed to add post", error);
    }
  };

  const handleFeedSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await addFeed(newFeed);
      setShowFeedForm(false);
      setNewFeed({ url: '', name: '' });
      // Refresh feeds
      const fetchedFeeds = await getFeeds();
      if (fetchedFeeds) setFeeds(fetchedFeeds);
    } catch (error) {
      console.error("Failed to add feed", error);
    }
  };

  const handleToolkitSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await addToolkitItem(newToolkitItem);
      setShowToolkitForm(false);
      setNewToolkitItem({ title: '', description: '', type: 'Prompt', content: '' });
      const fetched = await getToolkit();
      if (fetched) setToolkitItems(fetched);
    } catch (error) {
      console.error("Failed to add toolkit item", error);
    }
  };

  const handleIntelSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await addMarketIntel(newIntel);
      setShowIntelForm(false);
      setNewIntel({ region: 'Tri-state', title: '', description: '', coordinates: { lat: 38.4192, lng: -82.4452 } });
      const fetched = await getMarketIntel();
      if (fetched) setMarketIntel(fetched);
    } catch (error) {
      console.error("Failed to add market intel", error);
    }
  };

  const handleSignalAnalyze = async (e: FormEvent) => {
    e.preventDefault();
    if (!signalInput.trim()) return;
    setIsSignalLoading(true);
    try {
      const response = await fetch('/api/analyze-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal: signalInput })
      });
      if (response.ok) {
        const data = await response.json();
        setSignalAnalysis(data);
      }
    } catch (error) {
      console.error("Failed to analyze signal", error);
    } finally {
      setIsSignalLoading(false);
    }
  };

  const [isListening, setIsListening] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    business: ''
  });
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    business: false
  });

  // AI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQualifier, setShowQualifier] = useState(false);
  const [qualifierData, setQualifierData] = useState<any>(null);
  const [qualifierAnswers, setQualifierAnswers] = useState<string[]>([]);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: string, text: string}[]>([
    { role: "model", text: "Hey — tell me about your business. What do you do, and where are you based?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [pitchInput, setPitchInput] = useState({ type: '', market: '' });
  const [pitchResult, setPitchResult] = useState("");
  const [isPitchLoading, setIsPitchLoading] = useState(false);

  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [productQuestion, setProductQuestion] = useState("");
  const [productAnswer, setProductAnswer] = useState("");
  const [isExplainerLoading, setIsExplainerLoading] = useState(false);
  const [productFilter, setProductFilter] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeProduct) {
      // Ensure we scroll to the top of the modal content when a product is selected
      const timer = setTimeout(() => {
        if (modalScrollRef.current) {
          modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeProduct]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Speech Recognition
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        setIsChatOpen(true);
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          alert("Microphone access was denied. Please enable it in your browser settings to use voice features.");
        } else {
          alert(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
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

  const handleChatSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = { role: "user", text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);
    setIsTyping(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }]
      }));
      const response = await gemini.chatWithAI(chatInput, history);
      setChatMessages(prev => [...prev, { role: "model", text: response }]);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || "Sorry, I ran into an error. Please try again later.";
      setChatMessages(prev => [...prev, { role: "model", text: errorMsg }]);
      alert(`Chat Error: ${errorMsg}`);
    } finally {
      setIsChatLoading(false);
      setIsTyping(false);
    }
  };

  const renderMessageText = (text: string) => {
    const products = ["YardHub", "NotaryOS", "TrustFix", "FarmWise", "YardieBiz", "Signal to Startup", "PivotAI"];
    let parts: (string | any)[] = [text];

    products.forEach(product => {
      const newParts: (string | any)[] = [];
      parts.forEach(part => {
        if (typeof part === 'string') {
          const regex = new RegExp(`(${product})`, 'g');
          const split = part.split(regex);
          split.forEach(s => {
            if (s === product) {
              newParts.push(
                <span key={Math.random()} className="inline-block bg-amber-custom/20 border border-amber-custom/30 text-amber-custom px-2 py-0.5 rounded-md font-bold mx-1">
                  {s}
                </span>
              );
            } else if (s) {
              newParts.push(s);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    return parts;
  };

  const handlePitchGenerate = async () => {
    if (!pitchInput.type || !pitchInput.market) return;
    setIsPitchLoading(true);
    try {
      const result = await gemini.generateElevatorPitch(pitchInput.type, pitchInput.market);
      setPitchResult(result);
    } catch (error: any) {
      console.error(error);
      alert(`Failed to generate pitch: ${error.message || "Unknown error"}`);
    } finally {
      setIsPitchLoading(false);
    }
  };

  const handleProductExplain = async () => {
    if (!productQuestion.trim() || !activeProduct) return;
    setIsExplainerLoading(true);
    try {
      const result = await gemini.explainProduct(activeProduct.name, productQuestion);
      setProductAnswer(result);
    } catch (error: any) {
      console.error(error);
      alert(`Failed to explain product: ${error.message || "Unknown error"}`);
    } finally {
      setIsExplainerLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFieldValid('name', formData.name) || !isFieldValid('email', formData.email) || !isFieldValid('business', formData.business)) {
      setTouched({ name: true, email: true, business: true });
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await gemini.getWaitlistQuestions(formData.business);
      setQualifierData(data);
      setQualifierAnswers(new Array(data.questions.length).fill(""));
      setShowQualifier(true);
      
      // Save to Firebase
      await joinWaitlist({
        name: formData.name,
        email: formData.email,
        business: formData.business,
        productInterest: data.recommendedProduct
      });
    } catch (error: any) {
      console.error(error);
      alert(`Failed to join waitlist: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-stop listening after 3 seconds for demo purposes
  useEffect(() => {
    if (isListening) {
      const timer = setTimeout(() => setIsListening(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isListening]);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const getFieldError = (name: string, value: string) => {
    if (!touched[name as keyof typeof touched]) return null;
    if (name === 'name' && value.length > 0 && value.length < 2) return "Name must be at least 2 characters";
    if (name === 'email' && value.length > 0 && !validateEmail(value)) return "Please enter a valid email address";
    if (name === 'business' && value.length > 0 && value.length < 10) return "Please tell us a bit more about your business";
    return null;
  };

  const isFieldValid = (name: string, value: string) => {
    if (value.length === 0) return false;
    return getFieldError(name, value) === null;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  return (
    <div className="min-h-screen selection:bg-amber-custom selection:text-espresso">
      <Navbar 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        isAdmin={isAdmin} 
        setShowAdminDashboard={setShowAdminDashboard} 
      />

      <AnimatePresence>
        {showOnboarding && (
          <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>

      <main>
        <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-32 pb-20">
          {/* Background Texture/Gradient */}
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#CC7722_0%,transparent_50%)] opacity-30" />
            <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,#F2A900_0%,transparent_40%)] opacity-20" />
          </div>

          <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
            
            {/* Text Content */}
            <div className="lg:col-span-7 flex flex-col gap-8">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <span className="inline-block px-3 py-1 bg-ochre/20 border border-ochre/30 text-ochre text-xs font-bold uppercase tracking-widest rounded-md mb-6">
                  Now in Private Beta
                </span>
                <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.1] tracking-tighter text-balance">
                  Building the <br />
                  <span className="text-amber-custom italic font-serif font-medium inline-block py-1">Future of AI</span> Ventures
                </h1>
              </motion.div>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-lg md:text-xl text-cream/70 max-w-xl leading-relaxed font-light"
              >
                EntrepAIneur is a holding company dedicated to launching and scaling AI-driven applications for the global south. 
                From logistics to legal tech, we build tools that empower the next generation of builders.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                <button 
                  onClick={user ? () => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }) : handleLogin}
                  className="group relative bg-amber-custom text-espresso px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 overflow-hidden transition-all hover:scale-105 active:scale-95"
                >
                  <span className="relative z-10">{user ? "View Products" : "Get Started"}</span>
                  <ArrowRight className="relative z-10 group-hover:translate-x-1 transition-transform" size={20} />
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                </button>
                
                <a 
                  href="#waitlist" 
                  className="group border border-white/20 hover:border-white/40 px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all hover:bg-white/5 active:scale-95 text-white"
                >
                  <span>Join Waitlist</span>
                </a>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1 }}
                className="flex items-center gap-4 pt-8 border-t border-white/10 mt-4"
              >
                <div className="flex -space-x-3">
                  {['entrepreneur-1', 'entrepreneur-2', 'entrepreneur-3', 'entrepreneur-4'].map((seed, i) => (
                    <img 
                      key={i}
                      src={`https://picsum.photos/seed/${seed}/100/100`} 
                      alt="User" 
                      className="w-10 h-10 rounded-full border-2 border-espresso object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
                <p className="text-sm text-cream/50 font-medium">
                  Trusted by <span className="text-cream">500+ builders</span> across the Caribbean
                </p>
              </motion.div>
            </div>

            {/* Hero Image Container */}
            <div className="lg:col-span-5 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="relative aspect-[4/5] w-full max-w-md mx-auto"
              >
                {/* Image Frame */}
                <div className="absolute inset-0 border-2 border-amber-custom/30 rounded-3xl translate-x-4 translate-y-4 -z-10" />
                <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-2xl border border-white/10">
                  <img 
                    src="https://picsum.photos/seed/caribbean-business-owner/800/1000" 
                    alt="Entrepreneur at work" 
                    className="w-full h-full object-cover grayscale-[0.1] contrast-110 brightness-105"
                    referrerPolicy="no-referrer"
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/80 via-transparent to-transparent" />
                  
                  {/* Floating UI Element (Subtle) */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4"
                  >
                    <div className="w-10 h-10 bg-amber-custom rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 bg-espresso rounded-full animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-tighter text-amber-custom">Voice Assistant Active</p>
                      <p className="text-sm font-medium text-white">"Record 20 units of coffee sold..."</p>
                    </div>
                  </motion.div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-ochre/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-custom/10 rounded-full blur-3xl" />
              </motion.div>
            </div>
          </div>

          {/* Floating Voice Action Button */}
          <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  className="bg-amber-custom text-espresso px-4 py-2 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 mb-2"
                >
                  <Waves className="animate-pulse" size={16} />
                  <span>Listening...</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleListening}
              className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(242,169,0,0.3)] transition-colors duration-500 ${
                isListening ? 'bg-white text-ochre' : 'bg-amber-custom text-espresso'
              }`}
            >
              {/* Pulse Rings */}
              {isListening && (
                <>
                  <motion.div 
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 bg-amber-custom rounded-full"
                  />
                  <motion.div 
                    initial={{ scale: 1, opacity: 0.3 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="absolute inset-0 bg-amber-custom rounded-full"
                  />
                </>
              )}
              
              <Mic size={isListening ? 32 : 36} className="relative z-10" />
              
              {/* Explanatory Tooltip */}
              <AnimatePresence>
                {!isListening && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.8 }}
                    transition={{ delay: 1 }}
                    className="absolute right-full mr-4 top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none"
                  >
                    <div className="bg-espresso/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl shadow-2xl">
                      <p className="text-xs font-bold text-cream flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-custom rounded-full animate-pulse" />
                        Tap to speak to the AI assistant
                      </p>
                      {/* Tooltip Arrow */}
                      <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-espresso rotate-45 border-r border-t border-white/10" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </section>

        {/* Feature Grid Preview (Brief) */}
        <section className="py-24 bg-cream text-espresso">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 bg-ochre/10 rounded-xl flex items-center justify-center text-ochre">
                  <Menu size={24} />
                </div>
                <h3 className="font-display font-bold text-2xl">Inventory by Voice</h3>
                <p className="text-espresso/70">Just speak to your phone. We handle the counting, so you can handle the customers.</p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 bg-ochre/10 rounded-xl flex items-center justify-center text-ochre">
                  <ArrowRight size={24} />
                </div>
                <h3 className="font-display font-bold text-2xl">WhatsApp Native</h3>
                <p className="text-espresso/70">No new apps to learn. Run your entire business through the chat you already use.</p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 bg-ochre/10 rounded-xl flex items-center justify-center text-ochre">
                  <Play size={24} />
                </div>
                <h3 className="font-display font-bold text-2xl">Offline First</h3>
                <p className="text-espresso/70">Spotty connection? No problem. EntrepAIneur works wherever you are.</p>
              </div>
            </div>
          </div>
        </section>

        {/* WhatsApp Integration Section */}
        <section className="py-24 bg-espresso relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="order-2 lg:order-1"
              >
                <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                  <img 
                    src="https://picsum.photos/seed/whatsapp-business/1200/800" 
                    alt="WhatsApp Business Interface" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-espresso/40 to-transparent" />
                </div>
              </motion.div>
              <div className="order-1 lg:order-2">
                <span className="text-amber-custom font-bold text-xs uppercase tracking-widest mb-4 block">Zero Learning Curve</span>
                <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 leading-tight">Your business, <br /><span className="text-amber-custom">inside WhatsApp.</span></h2>
                <p className="text-cream/60 text-lg mb-8 leading-relaxed">
                  No new apps to download. No complex dashboards. EntrepAIneur lives where you already are. 
                  Send a voice note to track a sale. Snap a photo of a receipt to log an expense. 
                  It's that simple.
                </p>
                <ul className="space-y-4">
                  {[
                    "Voice-to-inventory tracking",
                    "Automated daily sales summaries",
                    "Customer debt reminders",
                    "Supplier price comparisons"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-cream/80">
                      <div className="w-5 h-5 bg-amber-custom/20 rounded-full flex items-center justify-center text-amber-custom">
                        <CheckCircle2 size={14} />
                      </div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* AI Product Finder CTA */}
        <section className="py-24 bg-espresso border-y border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-custom/5 via-transparent to-transparent opacity-50" />
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-8 leading-tight">
              Not sure where to start? <br />
              <span className="text-amber-custom">Find your product in 60 seconds.</span>
            </h2>
            <p className="text-cream/50 text-lg mb-12 max-w-2xl mx-auto">
              Our AI assistant understands the hustle. Tell us what you do, and we'll point you to the right tool for your trade.
            </p>
            <button 
              onClick={() => setIsChatOpen(true)}
              className="bg-amber-custom text-espresso font-bold px-10 py-5 rounded-full text-xl hover:scale-105 transition-all shadow-[0_0_40px_rgba(242,169,0,0.2)]"
            >
              Start AI Consultation
            </button>
          </div>
        </section>

        {/* Products Grid Section */}
        <section id="ventures" className="py-24 bg-espresso relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">Our Portfolio of Ventures</h2>
              <p className="text-cream/60 max-w-2xl mx-auto">We identify critical gaps in emerging markets and fill them with intelligent, scalable AI solutions.</p>
              
              {productFilter && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 flex items-center justify-center gap-4"
                >
                  <span className="text-sm text-cream/40 uppercase tracking-widest font-bold">Filtering by:</span>
                  <div className="flex items-center gap-2 bg-amber-custom/20 border border-amber-custom/30 px-4 py-2 rounded-full">
                    <span className="text-amber-custom font-bold text-sm">{productFilter}</span>
                    <button 
                      onClick={() => setProductFilter(null)}
                      className="text-amber-custom hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { 
                  name: "YardHub", 
                  desc: "Financial operating system for Caribbean informal vendors.", 
                  detailedDesc: "YardHub provides a full suite of financial tools designed specifically for the informal economy. From credit scoring based on alternative data to seamless WhatsApp-integrated payments, we help vendors professionalize and grow their businesses.",
                  image: "https://picsum.photos/seed/finance/800/600",
                  link: "#",
                  icon: "💰", 
                  color: "emerald" 
                },
                { 
                  name: "NotaryOS", 
                  desc: "Agentic AI platform for mobile notary professionals in the US.", 
                  detailedDesc: "NotaryOS automates the complex workflow of mobile notaries. It handles job scheduling, intelligent document generation, and strict compliance tracking, allowing professionals to focus on their clients instead of paperwork.",
                  image: "https://picsum.photos/seed/notary/800/600",
                  link: "#",
                  icon: "✒️", 
                  color: "amber" 
                },
                { 
                  name: "TrustFix", 
                  desc: "Home services marketplace connecting homeowners with vetted local trades.", 
                  detailedDesc: "TrustFix is a consumer-first platform that uses AI to vet and match local tradespeople with homeowners. We prioritize transparency, quality, and fair pricing in the home services industry.",
                  image: "https://picsum.photos/seed/trades/800/600",
                  link: "#",
                  icon: "🛠️", 
                  color: "blue" 
                },
                { 
                  name: "FarmWise", 
                  desc: "AI farming intelligence for smallholder farmers.", 
                  detailedDesc: "FarmWise brings high-tech agricultural insights to smallholder farms. Our AI analyzes weather patterns, soil data, and market pricing to provide actionable crop planning and yield optimization strategies.",
                  image: "https://picsum.photos/seed/farming/800/600",
                  link: "#",
                  icon: "🌱", 
                  color: "indigo" 
                },
                { 
                  name: "YardieBiz", 
                  desc: "WhatsApp AI business assistant for Jamaican food vendors.", 
                  detailedDesc: "YardieBiz lives where vendors already work: WhatsApp. Our AI assistant tracks daily sales, manages inventory, and provides simple financial summaries via voice or text messages.",
                  image: "https://picsum.photos/seed/food/800/600",
                  link: "#",
                  icon: "🍱", 
                  color: "pink" 
                },
                { 
                  name: "Signal to Startup", 
                  desc: "Turn news, policy, and market signals into actionable business opportunities.", 
                  detailedDesc: "Signal to Startup uses advanced AI to monitor global and local news, policy changes, and market trends. It distills complex signals into clear, actionable business opportunities for entrepreneurs looking for their next venture or seeking to pivot in a changing landscape.",
                  image: "https://picsum.photos/seed/signals/800/600",
                  link: "#",
                  icon: "📡", 
                  color: "cyan" 
                },
                { 
                  name: "PivotAI", 
                  desc: "Turn your experience into AI-ready opportunities.", 
                  detailedDesc: "PivotAI is the intelligent platform that maps your existing skills to high-growth AI roles and builds your personalized transition path. We help professionals navigate the AI economy by identifying transferable skills and providing a roadmap for upskilling.",
                  image: "https://picsum.photos/seed/pivot/800/600",
                  link: "#",
                  icon: "🚀", 
                  color: "violet" 
                }
              ].filter(p => !productFilter || p.name === productFilter).map((product, i) => (
                <motion.div
                  key={product.name}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="group bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all flex flex-col"
                >
                  <div className="text-4xl mb-6">{product.icon}</div>
                  <h3 className="font-display text-2xl font-bold mb-3 group-hover:text-amber-custom transition-colors">{product.name}</h3>
                  <p className="text-cream/50 text-sm leading-relaxed mb-6 flex-1">{product.desc}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductFilter(product.name);
                      }}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all border ${
                        productFilter === product.name 
                          ? 'bg-amber-custom border-amber-custom text-espresso' 
                          : 'bg-white/5 border-white/10 text-cream/40 hover:border-amber-custom/50 hover:text-amber-custom'
                      }`}
                    >
                      {product.name}
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => {
                        setActiveProduct(product);
                        setProductAnswer("");
                        setProductQuestion("");
                      }}
                      className="w-full bg-white/5 border border-white/10 text-cream font-bold py-3 rounded-xl hover:bg-amber-custom hover:text-espresso transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      Learn More <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Elevator Pitch Generator Section */}
        <section className="py-24 bg-ochre/10 relative">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <Sparkles className="mx-auto text-amber-custom mb-6" size={48} />
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 text-cream">Generate Your Elevator Pitch</h2>
            <div className="bg-espresso/50 backdrop-blur-md p-8 rounded-[2rem] border border-white/10 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Business Type</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Mobile Mechanic"
                    value={pitchInput.type}
                    onChange={(e) => setPitchInput(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream focus:outline-none focus:border-amber-custom"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Target Market</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Kingston, Jamaica"
                    value={pitchInput.market}
                    onChange={(e) => setPitchInput(prev => ({ ...prev, market: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream focus:outline-none focus:border-amber-custom"
                  />
                </div>
              </div>
              <button 
                onClick={handlePitchGenerate}
                disabled={isPitchLoading || !pitchInput.type || !pitchInput.market}
                className="bg-amber-custom text-espresso font-bold px-8 py-4 rounded-full hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
              >
                {isPitchLoading ? <Loader2 className="animate-spin mx-auto" /> : "Generate Pitch"}
              </button>

              <AnimatePresence>
                {pitchResult && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-8 p-6 bg-white/5 rounded-2xl border border-amber-custom/20 text-left"
                  >
                    <p className="text-cream/90 italic leading-relaxed">"{pitchResult}"</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Insights / Blog Section */}
        <section id="insights" className="py-24 bg-cream text-espresso relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div className="max-w-2xl">
                <span className="text-ochre font-mono text-xs tracking-widest uppercase mb-4 block">Insights & Strategy</span>
                <h2 className="text-4xl md:text-6xl font-display font-bold leading-tight">
                  The <span className="italic font-serif font-medium text-ochre">EntrepAIneur</span> Journal
                </h2>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-espresso/60 max-w-md text-lg font-light">
                  Deep dives into the intersection of AI, emerging markets, and the future of work.
                </p>
                {isAdmin && (
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => setShowPostForm(true)}
                      className="bg-espresso text-cream px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-ochre transition-colors"
                    >
                      <Plus size={14} /> New Journal Entry
                    </button>
                    <button 
                      onClick={() => setShowFeedForm(true)}
                      className="bg-white border border-espresso/10 text-espresso px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-cream/50 transition-colors"
                    >
                      <Plus size={14} /> Add RSS Feed
                    </button>
                    <button 
                      onClick={() => setShowToolkitForm(true)}
                      className="bg-espresso text-cream px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-ochre transition-colors"
                    >
                      <Plus size={14} /> Add Toolkit Resource
                    </button>
                    <button 
                      onClick={() => setShowIntelForm(true)}
                      className="bg-white border border-espresso/10 text-espresso px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-cream/50 transition-colors"
                    >
                      <Plus size={14} /> Add Market Intel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Phase 5: Signal to Startup */}
            <div className="mb-24">
              <SignalToStartup 
                onAnalyze={handleSignalAnalyze}
                isLoading={isSignalLoading}
                analysis={signalAnalysis}
              />
            </div>

            {/* Phase 3: Market Map */}
            <div className="mb-24">
              <MarketMap data={marketIntel} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              {/* Journal Entries */}
              <div className="lg:col-span-2 space-y-12">
                <h3 className="text-xl font-display font-bold uppercase tracking-widest text-ochre/40 border-b border-ochre/10 pb-4 mb-8">Journal Entries</h3>
                {isInsightsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-ochre" size={32} />
                  </div>
                ) : posts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {posts.map((post, i) => (
                      <motion.article 
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="group cursor-pointer"
                        onClick={() => setSelectedPost(post)}
                      >
                        <div className="relative aspect-[16/10] overflow-hidden rounded-3xl mb-6 shadow-xl">
                          <img 
                            src={post.image || `https://picsum.photos/seed/${post.id}/800/500`} 
                            alt={post.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-4 left-4">
                            <span className="bg-white/90 backdrop-blur-sm text-espresso text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-black/5">
                              {post.tags?.[0] || 'Insights'}
                            </span>
                          </div>
                        </div>
                        <p className="text-ochre font-bold text-[10px] uppercase tracking-widest mb-2">
                          {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Recent'} • {post.author}
                        </p>
                        <h3 className="font-display text-2xl font-bold mb-3 group-hover:text-ochre transition-colors leading-tight">{post.title}</h3>
                        <p className="text-espresso/60 text-sm leading-relaxed line-clamp-2">{post.excerpt}</p>
                      </motion.article>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center bg-white/50 rounded-3xl border border-dashed border-espresso/20">
                    <p className="text-espresso/40 italic">No journal entries yet.</p>
                  </div>
                )}
              </div>

              {/* RSS Feed Sidebar */}
              <div className="bg-white/50 rounded-[2.5rem] p-8 border border-espresso/5">
                <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
                  <Waves className="text-ochre" size={20} /> Market Signals
                </h3>
                <div className="space-y-8">
                  {rssItems.length > 0 ? (
                    rssItems.map((item, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        className="group"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">{item.feedName}</span>
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-espresso group-hover:text-ochre transition-colors block mb-2 leading-snug"
                        >
                          {item.title}
                        </a>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-espresso/40 uppercase tracking-widest">
                            {new Date(item.pubDate).toLocaleDateString()}
                          </span>
                          <ExternalLink size={12} className="text-espresso/20 group-hover:text-ochre transition-colors" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-espresso/40 italic">No signals detected.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Phase 1: Toolkit Section */}
            <div className="mt-32 pt-24 border-t border-ochre/10">
              <div className="text-center mb-16">
                <span className="text-ochre font-mono text-xs tracking-widest uppercase mb-4 block">Founder's Toolkit</span>
                <h2 className="text-4xl font-display font-bold mb-4">Gated Resources for Subscribed Founders</h2>
                <p className="text-espresso/60 max-w-2xl mx-auto">Access our curated library of high-value prompts, templates, and market guides.</p>
              </div>

              {!user ? (
                <div className="bg-espresso p-12 rounded-[2rem] text-center border border-white/10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-custom/10 via-transparent to-transparent opacity-50" />
                  <div className="relative z-10">
                    <ShieldCheck className="mx-auto text-amber-custom mb-6" size={48} />
                    <h3 className="text-2xl font-display font-bold text-cream mb-4">Members Only Access</h3>
                    <p className="text-cream/60 mb-8 max-w-md mx-auto">Log in with your Google account to unlock the full toolkit and exclusive market intelligence.</p>
                    <button 
                      onClick={handleLogin}
                      className="bg-amber-custom text-espresso font-bold px-8 py-4 rounded-full hover:scale-105 transition-all shadow-[0_0_40px_rgba(242,169,0,0.2)]"
                    >
                      Login to Unlock
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {toolkitItems.map((item, i) => (
                    <ToolkitCard key={item.id} item={item} isAdmin={isAdmin} />
                  ))}
                  {toolkitItems.length === 0 && (
                    <div className="col-span-full py-12 text-center text-espresso/40 italic border border-dashed border-ochre/20 rounded-2xl">
                      No toolkit resources available yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Waitlist Form Section */}
        <section id="waitlist" className="py-24 bg-espresso border-t border-white/10 relative overflow-hidden">
          {/* Subtle background element */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-ochre/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="max-w-3xl mx-auto px-6 relative z-10">
            <div className="text-center mb-12">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-display text-4xl md:text-5xl font-bold mb-4"
              >
                The Newsletter
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-cream/60"
              >
                Get our latest insights on AI and emerging markets delivered to your inbox. 
                No spam, just strategy.
              </motion.p>
            </div>

            <motion.form 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-8 bg-white/5 backdrop-blur-sm border border-white/10 p-8 md:p-12 rounded-[2rem]"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Full Name Field */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col gap-3"
                >
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ochre">Full Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full bg-espresso/50 border rounded-xl px-5 py-4 focus:outline-none transition-all text-cream placeholder:text-cream/20 ${
                        getFieldError('name', formData.name) 
                          ? 'border-red-500/50 focus:border-red-500' 
                          : isFieldValid('name', formData.name)
                            ? 'border-emerald-500/50 focus:border-emerald-500'
                            : 'border-white/10 focus:border-amber-custom'
                      }`} 
                      placeholder="e.g. Marcus Garvey" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isFieldValid('name', formData.name) && <CheckCircle2 className="text-emerald-500" size={20} />}
                      {getFieldError('name', formData.name) && <AlertCircle className="text-red-500" size={20} />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {getFieldError('name', formData.name) && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[10px] text-red-500 font-medium"
                      >
                        {getFieldError('name', formData.name)}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Email Field */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col gap-3"
                >
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ochre">Email Address</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full bg-espresso/50 border rounded-xl px-5 py-4 focus:outline-none transition-all text-cream placeholder:text-cream/20 ${
                        getFieldError('email', formData.email) 
                          ? 'border-red-500/50 focus:border-red-500' 
                          : isFieldValid('email', formData.email)
                            ? 'border-emerald-500/50 focus:border-emerald-500'
                            : 'border-white/10 focus:border-amber-custom'
                      }`} 
                      placeholder="marcus@example.com" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isFieldValid('email', formData.email) && <CheckCircle2 className="text-emerald-500" size={20} />}
                      {getFieldError('email', formData.email) && <AlertCircle className="text-red-500" size={20} />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {getFieldError('email', formData.email) && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[10px] text-red-500 font-medium"
                      >
                        {getFieldError('email', formData.email)}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Business Description Field */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="flex flex-col gap-3"
              >
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ochre">Tell us about your business</label>
                  <span className="text-[10px] text-cream/30 font-medium italic">Voice input enabled</span>
                </div>
                <div className="relative group">
                  <textarea 
                    name="business"
                    value={formData.business}
                    onChange={handleInputChange}
                    className={`w-full bg-espresso/50 border rounded-2xl px-5 py-5 pr-16 focus:outline-none transition-all text-cream placeholder:text-cream/20 min-h-[160px] resize-none ${
                      getFieldError('business', formData.business) 
                        ? 'border-red-500/50 focus:border-red-500' 
                        : isFieldValid('business', formData.business)
                          ? 'border-emerald-500/50 focus:border-emerald-500'
                          : 'border-white/10 focus:border-amber-custom'
                    }`} 
                    placeholder="I run a construction trade in Bridgetown and need to track materials..."
                  />
                  
                  {/* Voice Input Button in Form */}
                  <div className="absolute right-3 top-3 flex flex-col items-center gap-2">
                    <motion.button 
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsListening(!isListening)}
                      className={`relative p-3 rounded-xl transition-all flex items-center justify-center group/voice ${
                        isListening 
                          ? 'bg-white text-amber-custom shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                          : 'bg-white/5 text-cream/40 hover:text-amber-custom hover:bg-white/10'
                      }`}
                      title="Click to dictate"
                    >
                      {/* Pulse Rings for Form Button */}
                      {isListening && (
                        <>
                          <motion.div 
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 1.8, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 bg-white rounded-xl"
                          />
                        </>
                      )}

                      {isListening ? (
                        <div className="flex gap-1 items-center relative z-10">
                          <span className="text-[9px] font-bold uppercase tracking-tighter mr-1">Listening</span>
                          <motion.div animate={{ height: [6, 12, 6] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-amber-custom rounded-full" />
                          <motion.div animate={{ height: [10, 4, 10] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-amber-custom rounded-full" />
                          <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.4 }} className="w-0.5 bg-amber-custom rounded-full" />
                        </div>
                      ) : (
                        <Mic size={22} className="relative z-10" />
                      )}
                    </motion.button>
                    <div className="flex flex-col gap-1">
                      {isFieldValid('business', formData.business) && <CheckCircle2 className="text-emerald-500" size={20} />}
                      {getFieldError('business', formData.business) && <AlertCircle className="text-red-500" size={20} />}
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {getFieldError('business', formData.business) && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[10px] text-red-500 font-medium"
                    >
                      {getFieldError('business', formData.business)}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.button 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400, damping: 10 } }}
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="w-full group relative bg-amber-custom text-espresso font-bold py-5 rounded-2xl overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(242,169,0,0.2)] active:scale-[0.98] disabled:opacity-50"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Application"}
                  {!isSubmitting && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                </span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
              </motion.button>
            </motion.form>
          </div>
        </section>

        {/* Waitlist Qualifier Modal */}
        <AnimatePresence>
          {showQualifier && qualifierData && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowQualifier(false)}
                className="absolute inset-0 bg-espresso/90 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white/5 border border-white/10 p-8 md:p-12 rounded-[2.5rem] max-w-2xl w-full shadow-2xl"
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="text-amber-custom font-bold text-xs uppercase tracking-widest mb-2 block">AI Qualifier</span>
                    <h2 className="font-display text-3xl font-bold">Welcome to the inner circle</h2>
                  </div>
                  <button onClick={() => setShowQualifier(false)} className="text-cream/40 hover:text-cream"><X /></button>
                </div>

                <div className="mb-8 p-6 bg-amber-custom/10 border border-amber-custom/20 rounded-2xl">
                  <p className="text-amber-custom font-bold mb-2">Recommended: {qualifierData.recommendedProduct}</p>
                  <p className="text-cream/70 text-sm">{qualifierData.reasoning}</p>
                </div>

                <div className="space-y-6">
                  {qualifierData.questions.map((q: string, i: number) => (
                    <div key={i} className="space-y-2">
                      <p className="text-sm font-medium text-cream/80">{q}</p>
                      <input 
                        type="text" 
                        value={qualifierAnswers[i]}
                        onChange={(e) => {
                          const newAnswers = [...qualifierAnswers];
                          newAnswers[i] = e.target.value;
                          setQualifierAnswers(newAnswers);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream focus:outline-none focus:border-amber-custom"
                      />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setShowQualifier(false)}
                  className="w-full mt-8 bg-cream text-espresso font-bold py-4 rounded-xl hover:bg-amber-custom transition-all"
                >
                  Complete Profile
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Product Explainer Modal */}
        <AnimatePresence>
          {activeProduct && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveProduct(null)}
                className="absolute inset-0 bg-espresso/90 backdrop-blur-md"
              />
              <motion.div 
                ref={modalScrollRef}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white/5 border border-white/10 p-8 md:p-12 rounded-[2.5rem] max-w-3xl w-full shadow-2xl overflow-y-auto max-h-[90vh] scroll-smooth"
              >
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{activeProduct.icon}</div>
                    <div>
                      <span className="text-amber-custom font-bold text-xs uppercase tracking-widest mb-1 block">Product Deep Dive</span>
                      <h2 className="font-display text-3xl font-bold">{activeProduct.name}</h2>
                    </div>
                  </div>
                  <button onClick={() => setActiveProduct(null)} className="text-cream/40 hover:text-cream"><X /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video md:aspect-square">
                    <img 
                      src={activeProduct.image} 
                      alt={activeProduct.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-cream/80 leading-relaxed mb-6">{activeProduct.detailedDesc}</p>
                    <a 
                      href={activeProduct.link}
                      className="inline-flex items-center gap-2 text-amber-custom font-bold hover:underline"
                    >
                      Learn more at official site <ArrowRight size={16} />
                    </a>
                  </div>
                </div>

                <div className="space-y-4 mb-8 pt-8 border-t border-white/10">
                  <p className="text-sm font-bold text-ochre uppercase tracking-widest">Ask AI about this product</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="How does this handle offline sales?"
                      value={productQuestion}
                      onChange={(e) => setProductQuestion(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream focus:outline-none focus:border-amber-custom"
                    />
                    <button 
                      onClick={handleProductExplain}
                      disabled={isExplainerLoading || !productQuestion.trim()}
                      className="bg-amber-custom text-espresso p-3 rounded-xl hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {isExplainerLoading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {productAnswer && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-white/5 rounded-2xl border border-amber-custom/20"
                    >
                      <p className="text-cream/90 text-sm leading-relaxed">{productAnswer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Chat Widget */}
        <div className="fixed bottom-32 right-8 z-[60] flex flex-col items-end gap-4">
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: "bottom right" }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-[350px] md:w-[400px] h-[500px] bg-espresso border border-white/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="p-6 bg-white/5 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-custom rounded-full flex items-center justify-center text-espresso">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">EntrepAIneur Assistant</p>
                      <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                        Online
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="text-cream/40 hover:text-cream"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                        m.role === 'user' 
                          ? 'bg-amber-custom text-espresso font-medium rounded-tr-none' 
                          : 'bg-white/5 text-cream border border-white/10 rounded-tl-none'
                      }`}>
                        {renderMessageText(m.text)}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/10 flex gap-1 items-center">
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1.5 h-1.5 bg-amber-custom rounded-full" />
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 bg-amber-custom rounded-full" />
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 bg-amber-custom rounded-full" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChatSubmit} className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ask anything..."
                    value={chatInput}
                    disabled={isChatLoading}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-espresso border border-white/10 rounded-xl px-4 py-2 text-sm text-cream focus:outline-none focus:border-amber-custom disabled:opacity-50"
                  />
                  <button 
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="bg-amber-custom text-espresso p-2 rounded-xl hover:scale-105 transition-all disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${
              isChatOpen ? 'bg-white text-espresso' : 'bg-ochre text-cream'
            }`}
          >
            {isChatOpen ? <X size={28} /> : <MessageSquare size={28} />}
          </motion.button>
        </div>

        {/* New Post Modal */}
        <AnimatePresence>
          {showPostForm && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-espresso/90 backdrop-blur-xl">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="font-display text-3xl font-bold text-espresso">New Journal Entry</h2>
                  <button onClick={() => setShowPostForm(false)} className="text-espresso/40 hover:text-espresso"><X /></button>
                </div>
                <form onSubmit={handlePostSubmit} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Title</label>
                    <input 
                      required
                      type="text" 
                      value={newPost.title}
                      onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre"
                      placeholder="The Future of AI in..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Excerpt</label>
                    <textarea 
                      required
                      value={newPost.excerpt}
                      onChange={(e) => setNewPost(prev => ({ ...prev, excerpt: e.target.value }))}
                      className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre h-20"
                      placeholder="A brief summary of the post..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Content (Markdown)</label>
                    <textarea 
                      required
                      value={newPost.content}
                      onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre h-64 font-mono text-sm"
                      placeholder="# Your story starts here..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Image URL</label>
                      <input 
                        type="text" 
                        value={newPost.image}
                        onChange={(e) => setNewPost(prev => ({ ...prev, image: e.target.value }))}
                        className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Tags (comma separated)</label>
                      <input 
                        type="text" 
                        value={newPost.tags.join(', ')}
                        onChange={(e) => setNewPost(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()) }))}
                        className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre"
                        placeholder="AI, Strategy, Market"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-ochre text-cream font-bold py-4 rounded-xl hover:bg-espresso transition-colors">
                    Publish to Journal
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* New Feed Modal */}
        <AnimatePresence>
          {showFeedForm && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-espresso/90 backdrop-blur-xl">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-md w-full shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="font-display text-3xl font-bold text-espresso">Add RSS Feed</h2>
                  <button onClick={() => setShowFeedForm(false)} className="text-espresso/40 hover:text-espresso"><X /></button>
                </div>
                <form onSubmit={handleFeedSubmit} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Feed Name</label>
                    <input 
                      required
                      type="text" 
                      value={newFeed.name}
                      onChange={(e) => setNewFeed(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre"
                      placeholder="TechCrunch AI"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">RSS URL</label>
                    <input 
                      required
                      type="url" 
                      value={newFeed.url}
                      onChange={(e) => setNewFeed(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre"
                      placeholder="https://techcrunch.com/category/artificial-intelligence/feed/"
                    />
                  </div>
                  <button type="submit" className="w-full bg-ochre text-cream font-bold py-4 rounded-xl hover:bg-espresso transition-colors">
                    Add Feed Source
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Admin Dashboard Modal */}
        <AnimatePresence>
          {showAdminDashboard && isAdmin && (
            <AdminDashboard 
              waitlist={waitlistEntries} 
              onClose={() => setShowAdminDashboard(false)} 
            />
          )}
        </AnimatePresence>

        {/* New Toolkit Item Modal */}
        <AnimatePresence>
          {showToolkitForm && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-espresso/90 backdrop-blur-xl">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-md w-full shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="font-display text-3xl font-bold text-espresso">Add Toolkit Item</h2>
                  <button onClick={() => setShowToolkitForm(false)} className="text-espresso/40 hover:text-espresso"><X /></button>
                </div>
                <form onSubmit={handleToolkitSubmit} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Title</label>
                    <input 
                      required
                      type="text" 
                      value={newToolkitItem.title}
                      onChange={(e) => setNewToolkitItem(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre"
                      placeholder="e.g. AI Prompt for Market Research"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Description</label>
                    <textarea 
                      required
                      value={newToolkitItem.description}
                      onChange={(e) => setNewToolkitItem(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre h-20"
                      placeholder="What is this resource for?"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Type</label>
                    <select 
                      value={newToolkitItem.type}
                      onChange={(e) => setNewToolkitItem(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre"
                    >
                      <option>Prompt</option>
                      <option>Template</option>
                      <option>Guide</option>
                      <option>Case Study</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-ochre text-cream font-bold py-4 rounded-xl hover:bg-espresso transition-colors">
                    Add Resource
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* New Market Intel Modal */}
        <AnimatePresence>
          {showIntelForm && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-espresso/90 backdrop-blur-xl">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-md w-full shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="font-display text-3xl font-bold text-espresso">Add Market Intel</h2>
                  <button onClick={() => setShowIntelForm(false)} className="text-espresso/40 hover:text-espresso"><X /></button>
                </div>
                <form onSubmit={handleIntelSubmit} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Region</label>
                    <select 
                      value={newIntel.region}
                      onChange={(e) => setNewIntel(prev => ({ ...prev, region: e.target.value }))}
                      className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre"
                    >
                      <option>Tri-state</option>
                      <option>Jamaica</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Title</label>
                    <input 
                      required
                      type="text" 
                      value={newIntel.title}
                      onChange={(e) => setNewIntel(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre"
                      placeholder="e.g. New Tech Hub in Huntington"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ochre mb-2 block">Description</label>
                    <textarea 
                      required
                      value={newIntel.description}
                      onChange={(e) => setNewIntel(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-espresso/5 border border-espresso/10 rounded-xl px-4 py-3 text-espresso focus:outline-none focus:border-ochre h-20"
                      placeholder="Details about the signal..."
                    />
                  </div>
                  <button type="submit" className="w-full bg-ochre text-cream font-bold py-4 rounded-xl hover:bg-espresso transition-colors">
                    Add Signal
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Full Post Modal */}
        <AnimatePresence>
          {selectedPost && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-espresso/90 backdrop-blur-xl">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-cream rounded-[2.5rem] max-w-4xl w-full shadow-2xl overflow-y-auto max-h-[90vh] text-espresso"
              >
                <div className="relative h-64 md:h-96">
                  <img 
                    src={selectedPost.image || `https://picsum.photos/seed/${selectedPost.id}/1200/600`} 
                    alt={selectedPost.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cream via-transparent to-transparent" />
                  <button 
                    onClick={() => setSelectedPost(null)} 
                    className="absolute top-6 right-6 bg-white/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-white/40 transition-colors"
                  >
                    <X />
                  </button>
                </div>
                <div className="px-8 md:px-16 pb-16 -mt-12 relative z-10">
                  <div className="flex gap-2 mb-6">
                    {selectedPost.tags?.map(tag => (
                      <span key={tag} className="bg-ochre text-cream text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 leading-tight">{selectedPost.title}</h2>
                  <div className="flex items-center gap-4 mb-12 pb-8 border-b border-espresso/10">
                    <div className="w-12 h-12 bg-ochre rounded-full flex items-center justify-center text-cream font-bold">
                      {selectedPost.author[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{selectedPost.author}</p>
                      <p className="text-xs text-espresso/40">
                        {selectedPost.createdAt?.toDate ? selectedPost.createdAt.toDate().toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                  </div>
                  <div className="prose prose-espresso max-w-none">
                    <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-espresso py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-custom rounded-sm flex items-center justify-center">
              <span className="text-espresso font-display font-extrabold text-xs">E</span>
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-cream">
              Entrep<span className="text-amber-custom italic">AI</span>neur
            </span>
          </div>
          <p className="text-cream/40 text-sm">© 2026 EntrepAIneur. Built for the builders.</p>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex gap-6">
              <a href="#ventures" className="text-xs font-bold uppercase tracking-widest text-cream/40 hover:text-amber-custom transition-colors">Ventures</a>
              <a href="#insights" className="text-xs font-bold uppercase tracking-widest text-cream/40 hover:text-amber-custom transition-colors">Insights</a>
              <a href="#about" className="text-xs font-bold uppercase tracking-widest text-cream/40 hover:text-amber-custom transition-colors">About</a>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-cream/40 hover:text-cream transition-colors text-sm">Twitter</a>
              <a href="#" className="text-cream/40 hover:text-cream transition-colors text-sm">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
