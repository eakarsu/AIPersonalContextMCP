import React from 'react';
import AIPage from '../components/AIPage';
import { aiConflictDetector } from '../services/api';

export default function AIConflictDetectorPage() {
  return (
    <AIPage
      title="AI · Conflict Detector"
      feature="conflict-detector"
      subtitle="Detect contradictions across sources (calendar vs email vs notes)."
      inputs={[
        { key: 'sources_json', label: 'Sources (JSON object: source → text)', type: 'textarea', placeholder: '{"calendar":"…","email":"…","notes":"…"}' }
      ]}
      run={(v) => aiConflictDetector(v)}
    />
  );
}
