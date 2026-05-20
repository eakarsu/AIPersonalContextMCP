import React from 'react';
import AIPage from '../components/AIPage';
import { aiSchemaExtractor } from '../services/api';

export default function AISchemaExtractorPage() {
  return (
    <AIPage
      title="AI · Schema Extractor"
      feature="schema-extractor"
      subtitle="Schema Extractor"
      inputs={[
        { key: 'sample_data', label: 'Sample Data', type: 'textarea', placeholder: '' },
        { key: 'source_hint', label: 'Source Hint', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiSchemaExtractor(v)}
    />
  );
}
