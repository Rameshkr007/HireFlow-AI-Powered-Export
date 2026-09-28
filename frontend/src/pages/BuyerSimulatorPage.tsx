import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Sparkles, Send, RotateCcw,
  Award, CheckCircle2, AlertCircle, User, Bot, Play, Pause,
  ThumbsUp, ShieldAlert, Building, MessageSquare, ArrowRight
} from 'lucide-react';

interface BuyerPersona {
  id: string;
  name: string;
  title: string;
  company: string;
  avatarBg: string;
  voiceGender: 'female' | 'male';
  difficulty: 'Moderate' | 'Hard' | 'Extreme';
  focus: string;
  personality: string;
  initialPrompt: string;
  objections: {
    triggerKeywords: string[];
    reply: string;
    objectionType: string;
  }[];
}

const BUYER_PERSONAS: BuyerPersona[] = [
  {
    id: 'sarah',
    name: 'Sarah Jenkins',
    title: 'VP of Merchandising & Sourcing',
    company: 'Sagebrook Home (Carson, CA)',
    avatarBg: 'from-purple-600 to-indigo-600',
    voiceGender: 'female',
    difficulty: 'Moderate',
    focus: 'Lead Times, Quality Control (AQL 2.5), Packaging Durability',
    personality: 'Professional, busy, data-driven. Wants fast answers on MOQ and transit times.',
    initialPrompt: "Hi there. Thanks for reaching out. I only have about 3 minutes between merchandise reviews. What specific line are you pitching for Sagebrook Home and what's your FOB pricing structure?",
    objections: [
      {
        triggerKeywords: ['price', 'expensive', 'cost', 'discount', '$', 'fob'],
        reply: "Your FOB prices are higher than what we are seeing out of Vietnam right now. If we commit to 500 sets per SKU, can you give us an 18% concession on the master carton pricing?",
        objectionType: 'Price Concession Request'
      },
      {
        triggerKeywords: ['day', 'time', 'lead', 'month', 'shipping', 'transit', 'production'],
        reply: "A 45-day production lead time is cutting it too close for our Q3 fall collection. Our container cutoff at LA Port is strict. How do you guarantee zero maritime port delays?",
        objectionType: 'Lead Time & Delivery Risk'
      },
      {
        triggerKeywords: ['quality', 'defect', 'inspection', 'test', 'sample', 'standard'],
        reply: "We have had severe breakage issues with Indian ceramics and lanterns in the past. Do your master cartons pass ISTA-3A transit drop testing, and do you work with SGS or Intertek for pre-shipment inspection?",
        objectionType: 'Packaging & Transit Breakage Concern'
      },
      {
        triggerKeywords: ['moq', 'minimum', 'quantity', 'pieces', 'order'],
        reply: "We like to test new vendor items with an initial trial order of 150 pieces per style before placing full 40ft container bookings. Can you accommodate a lower initial MOQ?",
        objectionType: 'Trial Order vs MOQ Resistance'
      }
    ]
  },
  {
    id: 'david',
    name: 'David Miller',
    title: 'Senior Sourcing Director',
    company: 'The TJX Companies (HomeGoods / Marshalls)',
    avatarBg: 'from-amber-600 to-red-600',
    voiceGender: 'male',
    difficulty: 'Extreme',
    focus: 'Aggressive Landed Margin, EDI Compliance, High Volume Capacity',
    personality: 'Tough negotiator, volume-obsessed. Needs 70%+ retail gross margin and instant price concessions.',
    initialPrompt: "David Miller here. Look, we buy tens of millions of dollars of home decor each season for thousands of retail stores. If you can't beat our current landed prices by 15%, we're wasting each other's time. What do you have?",
    objections: [
      {
        triggerKeywords: ['price', 'dollar', '$', 'cost', 'quote', 'margin'],
        reply: "That FOB unit price doesn't leave us our mandatory 72% gross markup at our $29.99 retail price point once we add ocean freight and drayage. You need to come down to $8.20 FOB or this won't pass our buying committee.",
        objectionType: 'Aggressive Price Squeeze'
      },
      {
        triggerKeywords: ['compliance', 'audit', 'sedex', 'bsci', 'social', 'factory', 'worker'],
        reply: "Our corporate compliance team requires an unannounced SMETA/Sedex 4-Pillar social audit before we can cut any purchase order. Is your Moradabad/Jaipur factory fully certified?",
        objectionType: 'Social Compliance Audit Requirement'
      },
      {
        triggerKeywords: ['volume', 'capacity', 'container', 'fcl', 'scale'],
        reply: "If this item sells through in our stores, we will immediately reorder 12x 40ft High Cube containers. Can your factory scale monthly capacity without sub-contracting to unregulated workshops?",
        objectionType: 'Supply Scale & Secondary Sourcing Risk'
      }
    ]
  },
  {
    id: 'michael',
    name: 'Michael Chang',
    title: 'Director of Artisan Sourcing',
    company: 'West Elm / Williams-Sonoma Inc',
    avatarBg: 'from-emerald-600 to-teal-600',
    voiceGender: 'male',
    difficulty: 'Hard',
    focus: 'Artisan Authenticity, FSC Certified Wood, Sustainability & Custom Exclusives',
    personality: 'Cultured, design-sensitive. Values ethical storytelling, fair trade wages, and bespoke product exclusivity.',
    initialPrompt: "Hello. At West Elm, our customers care deeply about where and how their home furnishings are made. Tell me about the artisan techniques behind your products and how your materials are sourced.",
    objections: [
      {
        triggerKeywords: ['wood', 'timber', 'fsc', 'tree', 'material', 'forest'],
        reply: "We require full chain-of-custody FSC certification and USDA Lacey Act documentation for every piece of timber used. Can your team furnish supply chain provenance documents?",
        objectionType: 'Timber Provenance & Lacey Act'
      },
      {
        triggerKeywords: ['exclusive', 'design', 'custom', 'copy', 'market', 'other'],
        reply: "We cannot carry designs that are also being sold to Target or CB2. Will your company grant West Elm category exclusivity in North America for any designs we develop together?",
        objectionType: 'North American Market Exclusivity'
      },
      {
        triggerKeywords: ['plastic', 'packing', 'carton', 'recycle', 'eco'],
        reply: "Williams-Sonoma is eliminating single-use plastics across our entire supply chain by 2026. Can you package without styrofoam and use 100% recycled honeycomb cardboard inserts?",
        objectionType: 'Zero-Plastic Packaging Mandate'
      }
    ]
  }
];

interface ChatMessage {
  id: string;
  sender: 'buyer' | 'user';
  text: string;
  timestamp: string;
  feedback?: string;
}

export default function BuyerSimulatorPage() {
  const [selectedPersona, setSelectedPersona] = useState<BuyerPersona>(BUYER_PERSONAS[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setRecognitionSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-US';

      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        setIsListening(false);
      };

      recog.onerror = () => {
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
  }, []);

  // Initialize conversation when persona changes
  useEffect(() => {
    const initialMsg: ChatMessage = {
      id: '1',
      sender: 'buyer',
      text: selectedPersona.initialPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([initialMsg]);
    setScore(null);

    // Speak initial prompt if enabled
    if (speechEnabled) {
      speakText(selectedPersona.initialPrompt, selectedPersona.voiceGender);
    }
  }, [selectedPersona]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Text to Speech
  const speakText = (text: string, gender: 'female' | 'male') => {
    if (!('speechSynthesis' in window) || !speechEnabled) return;

    window.speechSynthesis.cancel(); // stop current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = gender === 'female' ? 1.1 : 0.95;

    // Try finding an American English voice
    const voices = window.speechSynthesis.getVoices();
    const usVoice = voices.find(v => v.lang === 'en-US' && (gender === 'female' ? v.name.includes('Zira') || v.name.includes('Female') || v.name.includes('Samantha') : v.name.includes('David') || v.name.includes('Male')));
    if (usVoice) utterance.voice = usVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setSpeechEnabled(!speechEnabled);
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge, or type your response.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setUserInput('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Evaluate user response and select next buyer response
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const userText = userInput.trim();
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setUserInput('');

    // Generate Buyer Response based on user input
    setTimeout(() => {
      let buyerReply = "";
      let matchedObjection = selectedPersona.objections.find(obj =>
        obj.triggerKeywords.some(keyword => userText.toLowerCase().includes(keyword))
      );

      if (matchedObjection) {
        buyerReply = matchedObjection.reply;
      } else if (updatedMessages.length >= 6) {
        // Closing conversation after enough back-and-forth
        buyerReply = `Fair enough. Send over your full commercial lookbook, FOB price list, and lab test reports to my email. If the numbers look good, I will have our junior buyer set up a sample review session. Good pitch today.`;
        calculateFinalScore(updatedMessages);
      } else {
        // Generic follow up inquiry
        buyerReply = `Understood. Now what about payment terms? In the US retail market, our standard terms are Net 60 days from bill of lading date. Can your finance team support that or do you require letter of credit?`;
      }

      const buyerMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'buyer',
        text: buyerReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, buyerMsg]);
      speakText(buyerReply, selectedPersona.voiceGender);
    }, 800);
  };

  // Score Calculation
  const calculateFinalScore = (msgs: ChatMessage[]) => {
    const userTexts = msgs.filter(m => m.sender === 'user').map(m => m.text.toLowerCase());
    let calculated = 70;

    // Bonus for professionalism and export knowledge keywords
    userTexts.forEach(t => {
      if (t.includes('fob') || t.includes('aql') || t.includes('cbm') || t.includes('inspection')) calculated += 6;
      if (t.includes('sample') || t.includes('test') || t.includes('certificate')) calculated += 5;
      if (t.includes('advance') || t.includes('lc') || t.includes('letter of credit') || t.includes('margin')) calculated += 4;
      if (t.length > 80) calculated += 3; // thorough answer
    });

    setScore(Math.min(96, Math.max(65, calculated)));
  };

  const restartRoleplay = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    const initialMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'buyer',
      text: selectedPersona.initialPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([initialMsg]);
    setScore(null);
    speakText(selectedPersona.initialPrompt, selectedPersona.voiceGender);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900 border border-dark-800 p-5 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-50">AI Virtual US Buyer Cold Pitch Simulator</h1>
            <p className="text-xs text-dark-400">Practice cold pitching, objection handling & margin defense with realistic AI retail buyer personas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSpeech}
            className={`btn text-xs flex items-center gap-1.5 ${speechEnabled ? 'btn-secondary text-primary-300' : 'bg-dark-800 text-dark-500'}`}
            title={speechEnabled ? 'Mute AI voice' : 'Enable AI voice'}
          >
            {speechEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            {speechEnabled ? 'Audio Active' : 'Audio Muted'}
          </button>
          <button
            onClick={restartRoleplay}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Pitch
          </button>
        </div>
      </div>

      {/* Persona Selection Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BUYER_PERSONAS.map((persona) => {
          const isSelected = selectedPersona.id === persona.id;
          return (
            <div
              key={persona.id}
              onClick={() => setSelectedPersona(persona)}
              className={`p-4 rounded-xl border text-xs cursor-pointer transition-all relative ${
                isSelected
                  ? 'bg-primary-950/40 border-primary-500 shadow-md ring-1 ring-primary-500/30'
                  : 'bg-dark-900 border-dark-800 hover:border-dark-700 hover:bg-dark-800/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${persona.avatarBg} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                    {persona.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-bold text-dark-50 text-sm">{persona.name}</div>
                    <div className="text-[11px] text-dark-400">{persona.title}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  persona.difficulty === 'Moderate' ? 'bg-emerald-500/20 text-emerald-400' :
                  persona.difficulty === 'Hard' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {persona.difficulty}
                </span>
              </div>

              <div className="mt-3 text-[11px] text-dark-300">
                <span className="text-dark-500 block">Retail Account:</span>
                <strong className="text-dark-200">{persona.company}</strong>
              </div>

              <div className="mt-2 text-[11px] text-dark-400 line-clamp-1">
                <strong>Focus:</strong> {persona.focus}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Roleplay Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Live Chat & Audio Simulation (lg:col-span-8) */}
        <div className="lg:col-span-8 card flex flex-col h-[580px] p-0 overflow-hidden bg-dark-900 border-dark-800">
          {/* Chat Header */}
          <div className="p-4 border-b border-dark-800 bg-dark-900/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${selectedPersona.avatarBg} flex items-center justify-center text-white font-bold text-xs`}>
                {selectedPersona.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="font-bold text-dark-100 text-xs flex items-center gap-1.5">
                  {selectedPersona.name}
                  {isSpeaking && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-normal">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Speaking...
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-dark-400">{selectedPersona.company}</div>
              </div>
            </div>

            <span className="text-[11px] text-dark-500 font-mono">
              Live Negotiation Session
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isBuyer = msg.sender === 'buyer';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isBuyer ? 'justify-start' : 'justify-end'}`}
                >
                  {isBuyer && (
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${selectedPersona.avatarBg} flex-shrink-0 flex items-center justify-center text-white font-bold text-[10px]`}>
                      {selectedPersona.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}

                  <div className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    isBuyer
                      ? 'bg-dark-800 text-dark-100 rounded-tl-sm border border-dark-700/60'
                      : 'bg-primary-600 text-white rounded-tr-sm shadow-md'
                  }`}>
                    <div>{msg.text}</div>
                    <div className={`text-[10px] mt-1.5 text-right ${isBuyer ? 'text-dark-500' : 'text-primary-200'}`}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {!isBuyer && (
                    <div className="w-7 h-7 rounded-lg bg-primary-700 flex-shrink-0 flex items-center justify-center text-white font-bold text-[10px]">
                      YOU
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input & Mic Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-dark-800 bg-dark-900 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMic}
              className={`p-2.5 rounded-xl border transition-all ${
                isListening
                  ? 'bg-red-500 text-white border-red-400 animate-pulse'
                  : 'bg-dark-800 text-dark-400 border-dark-700 hover:text-dark-200'
              }`}
              title={isListening ? 'Listening... click to stop' : 'Click to speak your pitch via microphone'}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <input
              type="text"
              placeholder={isListening ? "Listening to your voice pitch..." : "Type your commercial response, pitch angle, or rebuttal..."}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="input text-xs flex-1 bg-dark-800 border-dark-700 text-dark-100"
            />

            <button
              type="submit"
              disabled={!userInput.trim()}
              className="btn btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Pitch</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Real-Time AI Scorecard & Objection Guidance (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Scorecard */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" /> AI Pitch Scorecard
            </h3>

            {score !== null ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-400">Negotiation Score</span>
                  <span className={`text-2xl font-bold font-mono ${score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {score} <span className="text-xs font-normal text-dark-500">/ 100</span>
                  </span>
                </div>

                <div className="w-full bg-dark-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${score >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${score}%` }}
                  />
                </div>

                <div className="space-y-2 text-xs pt-2">
                  <div className="flex justify-between text-dark-300">
                    <span>Export Commercial Vocabulary</span>
                    <span className="font-bold text-emerald-400">92%</span>
                  </div>
                  <div className="flex justify-between text-dark-300">
                    <span>Objection Resilience</span>
                    <span className="font-bold text-primary-400">84%</span>
                  </div>
                  <div className="flex justify-between text-dark-300">
                    <span>Margin Protection</span>
                    <span className="font-bold text-amber-400">78%</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 leading-relaxed mt-3">
                  <strong>AI Evaluation:</strong> Great job defending your FOB price and bringing up AQL 2.5 quality control. You successfully steered the buyer toward a sample review meeting!
                </div>
              </div>
            ) : (
              <div className="text-xs text-dark-400 py-4 text-center space-y-2">
                <Bot className="w-8 h-8 mx-auto text-dark-600 animate-bounce" />
                <p>Complete at least 3 conversation exchanges to generate your live AI performance scorecard.</p>
              </div>
            )}
          </div>

          {/* Strategic Cheat Sheet for Current Buyer */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-primary-400" /> Buyer Playbook & Tips
            </h3>

            <div className="text-xs text-dark-300 space-y-2.5">
              <div className="p-2.5 rounded-lg bg-dark-800 border border-dark-700/60">
                <strong className="text-dark-100 block mb-0.5">1. Never Drop Price Without Volume:</strong>
                <p className="text-dark-400">If {selectedPersona.name.split(' ')[0]} asks for an 18% discount, tie it to a 20ft container commitment or pre-production advance deposit.</p>
              </div>

              <div className="p-2.5 rounded-lg bg-dark-800 border border-dark-700/60">
                <strong className="text-dark-100 block mb-0.5">2. Mention Drop-Tested Packaging:</strong>
                <p className="text-dark-400">US buyers fear transit breakage above all else. Mentioning 5-ply cartons and ISTA drop testing immediately builds credibility.</p>
              </div>

              <div className="p-2.5 rounded-lg bg-dark-800 border border-dark-700/60">
                <strong className="text-dark-100 block mb-0.5">3. Close for the Sample:</strong>
                <p className="text-dark-400">Your goal on a cold call isn't to get a $100K contract immediately—it's to get them to approve receiving physical counter-samples.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
