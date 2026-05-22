import React from 'react';
import AIPage from '../components/AIPage';
import { aiQueryRewriter } from '../services/api';

export default function AIQueryRewriterPage() {
  return (
    <AIPage
      title="AI · Query Rewriter"
      feature="query-rewriter"
      subtitle="Rewrite assistant queries for personal-context retrieval (expand pronouns, inject user-scope, strip identifiers)."
      inputs={[
        { key: 'original_query', label: 'Original Query', type: 'text', placeholder: '' },
        { key: 'user_context', label: 'User Context Hints', type: 'textarea', placeholder: 'optional facts about user' },
        { key: 'target_app', label: 'Target App', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiQueryRewriter(v)}
    />
  );
}
