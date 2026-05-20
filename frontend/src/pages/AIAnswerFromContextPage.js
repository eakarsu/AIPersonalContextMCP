import React from 'react';
import AIPage from '../components/AIPage';
import { aiAnswerFromContext } from '../services/api';

export default function AIAnswerFromContextPage() {
  return (
    <AIPage
      title="AI · Answer App Query"
      feature="answer-from-context"
      subtitle="Answer App Query"
      inputs={[
        { key: 'requesting_app', label: 'Requesting App', type: 'text', placeholder: '' },
        { key: 'question', label: 'App\'s Question', type: 'textarea', placeholder: '' },
        { key: 'allowed_sources', label: 'Allowed Sources', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiAnswerFromContext(v)}
    />
  );
}
