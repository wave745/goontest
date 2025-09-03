import { Bot } from 'lucide-react';

export default function SystemBadge() {
  return (
    <span className="inline-flex items-center gap-2 bg-accent/20 text-accent text-xs font-semibold px-3 py-1.5 rounded-full border border-accent/30">
      <Bot className="h-3 w-3" />
      AI Persona
    </span>
  );
}
