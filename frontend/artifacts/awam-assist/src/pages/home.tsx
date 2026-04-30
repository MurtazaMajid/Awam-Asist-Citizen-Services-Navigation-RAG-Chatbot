import { useState, useRef, useEffect } from "react";
import { useSendChatMessage } from "@workspace/api-client-react";
import { Send, MapPin, Loader2, RefreshCw } from "lucide-react";

// Types mapping closely to what the generated client uses
type ChatRole = "user" | "assistant";
type ChatCategory = "all" | "zakat" | "iesco" | "transport" | "marriage" | "emergency";

interface Message {
  role: ChatRole;
  content: string;
  isError?: boolean;
}

interface Suggestion {
  label: string;
  prompt: string;
}

const CATEGORIES: { value: ChatCategory; label: string }[] = [
  { value: "all", label: "All services" },
  { value: "zakat", label: "Zakat & welfare" },
  { value: "iesco", label: "Electricity (IESCO)" },
  { value: "transport", label: "Transport" },
  { value: "marriage", label: "Marriage & birth" },
  { value: "emergency", label: "Emergency" },
];

const INITIAL_GREETING = "Assalam o Alaikum! I'm Awam Assist. I can help you with government services across Pakistan — including Zakat, electricity connections, transport, marriage and birth certificates, and emergency services.\n\nWhat would you like help with today?";

const INITIAL_SUGGESTIONS: Suggestion[] = [
  { label: "Zakat eligibility", prompt: "Am I eligible for Zakat Guzara allowance?" },
  { label: "New electricity connection", prompt: "How do I get a new electricity connection?" },
  { label: "Marriage registration", prompt: "How do I register my marriage?" },
  { label: "Emergency helpline", prompt: "What is the emergency helpline number?" },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_GREETING }
  ]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(INITIAL_SUGGESTIONS);
  const [category, setCategory] = useState<ChatCategory>("all");
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useSendChatMessage();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, suggestions, chatMutation.isPending]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim() || chatMutation.isPending) return;

    // Clear current suggestions and input
    setSuggestions([]);
    setInput("");

    // Add user message
    const newMessages = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(newMessages);

    try {
      // Exclude error messages from history sent to API
      const historyForApi = newMessages.filter(m => !m.isError).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await chatMutation.mutateAsync({
        data: {
          messages: historyForApi,
          category: category !== "all" ? category : undefined
        }
      });

      setMessages(prev => [...prev, { role: "assistant", content: response.reply }]);
      setSuggestions(response.suggestions || []);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Something went wrong while connecting to the service. Please try again.",
        isError: true
      }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleRetry = (failedMessageIndex: number) => {
    // Find the last user message before the error
    let lastUserMessage = "";
    const filteredMessages = messages.slice(0, failedMessageIndex).filter(m => !m.isError);
    for (let i = filteredMessages.length - 1; i >= 0; i--) {
      if (filteredMessages[i].role === "user") {
        lastUserMessage = filteredMessages[i].content;
        break;
      }
    }
    
    // Remove the error message and any trailing user messages that we'll resend
    setMessages(prev => prev.slice(0, failedMessageIndex));
    if (lastUserMessage) {
      // We don't call handleSend directly to avoid appending the user message twice if we sliced it out
      // Actually, since we sliced off the error, the user message is still in history. Let's just pop it and resend.
      const msgsWithoutError = messages.slice(0, failedMessageIndex);
      const lastMsg = msgsWithoutError[msgsWithoutError.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        setMessages(msgsWithoutError.slice(0, -1));
        handleSend(lastMsg.content);
      }
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#E8ECEA] bg-gradient-to-b from-[#F7F9F8] to-[#E8ECEA] flex flex-col items-center sm:p-6 md:p-10 font-sans">
      <div className="w-full max-w-2xl bg-card sm:border border-border/50 sm:rounded-[24px] sm:shadow-xl shadow-sm flex flex-col h-[100dvh] sm:h-[85vh] sm:max-h-[800px] overflow-hidden relative">
        
        {/* Header */}
        <header className="px-5 py-4 border-b border-border/60 bg-card/95 backdrop-blur-sm z-10 flex items-center gap-4 shrink-0">
          <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-primary-foreground">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-semibold text-foreground tracking-tight leading-tight">Awam Assist</h1>
            <p className="text-[13px] text-muted-foreground truncate">Pakistan Government Services</p>
          </div>
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1 rounded-full border border-secondary shrink-0">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[12px] font-medium text-secondary-foreground">Online</span>
          </div>
        </header>

        {/* Categories Bar */}
        <div className="flex gap-2 px-5 py-3 border-b border-border/40 overflow-x-auto scrollbar-none shrink-0 bg-muted/30">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-200 border ${
                category === cat.value
                  ? "bg-secondary border-primary/30 text-secondary-foreground shadow-sm"
                  : "bg-card border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6 scrollbar-none relative">
          <div className="text-center w-full mt-2 mb-4">
            <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full uppercase tracking-wider">Today</span>
          </div>

          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex gap-3 max-w-[88%] ${msg.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold shadow-sm ${
                msg.role === "assistant" 
                  ? "bg-secondary text-secondary-foreground" 
                  : "bg-primary text-primary-foreground"
              }`}>
                {msg.role === "assistant" ? "AI" : "You"}
              </div>

              {/* Bubble */}
              <div className="flex flex-col gap-2 min-w-0">
                <div className={`px-4 py-3 text-[14.5px] leading-relaxed break-words shadow-sm ${
                  msg.role === "assistant"
                    ? msg.isError 
                      ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl rounded-tl-sm"
                      : "bg-card border border-border/80 text-foreground rounded-2xl rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                }`}>
                  <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                  
                  {msg.isError && (
                    <button 
                      onClick={() => handleRetry(idx)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity bg-background px-3 py-1.5 rounded-full border border-destructive/20 w-fit"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  )}
                </div>

                {/* Suggestions specifically for the last assistant message */}
                {msg.role === "assistant" && !msg.isError && idx === messages.length - 1 && suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
                    {suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSend(sug.prompt)}
                        className="px-3.5 py-2 text-[13px] font-medium border border-primary/30 text-secondary-foreground rounded-xl hover:bg-secondary hover:border-primary/50 transition-all text-left bg-card shadow-sm hover:shadow active:scale-95"
                      >
                        {sug.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {chatMutation.isPending && (
            <div className="flex gap-3 max-w-[85%] self-start animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold bg-secondary text-secondary-foreground shadow-sm">
                AI
              </div>
              <div className="bg-card border border-border/80 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm h-[46px]">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/60 bg-card/95 backdrop-blur shrink-0 pb-safe">
          <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any government service..."
                disabled={chatMutation.isPending}
                className="w-full pl-5 pr-12 py-3.5 bg-muted/40 border border-border/80 rounded-full text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all disabled:opacity-60 shadow-sm"
              />
            </div>
            
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || chatMutation.isPending}
              className="w-[52px] h-[52px] shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:bg-primary shadow-md active:scale-95 disabled:active:scale-100 group absolute right-1 bottom-0.5"
              aria-label="Send message"
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              )}
            </button>
          </div>
          <div className="text-center mt-3">
            <p className="text-[11px] text-muted-foreground/70">Awam Assist provides verified guidance but does not process applications directly.</p>
          </div>
        </div>
        
      </div>
    </div>
  );
}
