import React from 'react';
import AIPage from '../components/AIPage';
import { aiContextSummarizer } from '../services/api';

export default function AIContextSummarizerPage() {
  return (
    <AIPage
      title="AI · Context Summarizer"
      feature="context-summarizer"
      subtitle="Condense raw context (email thread, doc, calendar block) into an assistant-ready brief."
      inputs={[
        { key: 'context_kind', label: 'Context Kind', type: 'text', placeholder: 'email_thread | calendar | notes | doc' },
        { key: 'raw_context', label: 'Raw Context', type: 'textarea', placeholder: 'paste raw context here…' },
        { key: 'target_app', label: 'Target App', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiContextSummarizer(v)}
    />
  );
}
