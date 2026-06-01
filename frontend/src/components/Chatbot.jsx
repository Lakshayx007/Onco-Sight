import React, { useState } from 'react';
import { Sparkles, Send, X, Loader2, Bot } from 'lucide-react';

export default function Chatbot({ isOpen, setIsOpen, messages, setMessages, isLoading, setIsLoading, cancer }) {
  const [input, setInput] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api'}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg, cancer: cancer })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'The intelligence server is not responding yet. Start the FastAPI backend and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <aside 
        className={`z-40 flex h-screen flex-col border-l border-border bg-surface shadow-xl transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? 'w-96 fixed right-0 lg:relative lg:flex-shrink-0 translate-x-0 lg:translate-x-0' : 'w-96 lg:w-0 fixed right-0 lg:relative lg:flex-shrink-0 translate-x-full lg:translate-x-0'}`}
      >
        <div className="w-96 flex flex-col h-full min-w-[24rem]">
          <div className="border-b border-border px-5 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg border border-accent/40 bg-accent/10">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Intelligence</h3>
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Strategic Analyst</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-muted hover:text-primary transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted px-4 space-y-3">
                <Bot className="w-10 h-10 text-border" />
                <p className="text-sm">Ask questions about the pipeline, top assets, phase transitions, and competitor landscape.</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-accent text-white rounded-br-none' 
                      : 'bg-background border border-border text-primary rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-background border border-border rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  <span className="text-xs text-muted">Analyzing context...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-border bg-background">
            <div className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Ask about ${cancer}...`}
                className="w-full bg-surface border border-border rounded-xl pl-4 pr-12 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors shadow-sm"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-1.5 bg-accent/10 text-accent hover:bg-accent hover:text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden transition-opacity" 
        />
      )}
    </>
  );
}
