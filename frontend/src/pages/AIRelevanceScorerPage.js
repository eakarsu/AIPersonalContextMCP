import React from 'react';
import AIPage from '../components/AIPage';
import { aiRelevanceScorer } from '../services/api';

export default function AIRelevanceScorerPage() {
  return (
    <AIPage
      title="AI · Relevance Scorer"
      feature="relevance-scorer"
      subtitle="Per-query scoring of each candidate context shard."
      inputs={[
        { key: 'query', label: 'Query', type: 'text', placeholder: '' },
        { key: 'candidate_shards', label: 'Candidate Shards (JSON array)', type: 'textarea', placeholder: '[{"id":"…","text":"…","source":"…"}]' }
      ]}
      run={(v) => aiRelevanceScorer(v)}
    />
  );
}
