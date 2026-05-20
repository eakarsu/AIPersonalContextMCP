import React from 'react';
import AIPage from '../components/AIPage';
import { aiIntentClassifier } from '../services/api';

export default function AIIntentClassifierPage() {
  return (
    <AIPage
      title="AI · Intent Classifier"
      feature="intent-classifier"
      subtitle="Intent Classifier"
      inputs={[
        { key: 'app_query', label: 'App\'s Query', type: 'textarea', placeholder: '' }
      ]}
      run={(v) => aiIntentClassifier(v)}
    />
  );
}
