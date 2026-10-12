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
        { key: 'candidate_shards', label: 'Candidate Shards (JSON array)', type: 'json', jsonShape: 'array', example: [{ id: 'fictional-draft-a', text: 'Fictional planning note: an illustrative trip next month.', source: 'fictional draft notes' }], placeholder: '[{"id":"local-draft-label","text":"Fictional note content","source":"fictional draft notes"}]' }
      ]}
      run={(v, requestOptions) => aiRelevanceScorer(v, requestOptions)}
    />
  );
}
