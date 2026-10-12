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
        { key: 'sources_json', label: 'Sources (JSON object: source → text)', type: 'json', jsonShape: 'object', example: { fictional_calendar: 'Draft meeting planned for Tuesday at 10:00.', fictional_email: 'Draft message proposes Tuesday at 11:00.', fictional_notes: 'Verify the meeting time with participants before use.' }, placeholder: '{"fictional_calendar":"Draft meeting at 10:00","fictional_email":"Draft proposal for 11:00"}' }
      ]}
      run={(v, requestOptions) => aiConflictDetector(v, requestOptions)}
    />
  );
}
