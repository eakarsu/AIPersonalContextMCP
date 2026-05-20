import React from 'react';
import AIPage from '../components/AIPage';
import { aiRedactionSuggester } from '../services/api';

export default function AIRedactionSuggesterPage() {
  return (
    <AIPage
      title="AI · Redaction Suggester"
      feature="redaction-suggester"
      subtitle="Redaction Suggester"
      inputs={[
        { key: 'snippet', label: 'Snippet', type: 'textarea', placeholder: '' },
        { key: 'target_app', label: 'Target App', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiRedactionSuggester(v)}
    />
  );
}
