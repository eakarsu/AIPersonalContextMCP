import React from 'react';
import AIPage from '../components/AIPage';
import { aiPrivacyRiskScore } from '../services/api';

export default function AIPrivacyRiskScorePage() {
  return (
    <AIPage
      title="AI · Privacy Risk Score"
      feature="privacy-risk-score"
      subtitle="Privacy Risk Score"
      inputs={[
        { key: 'app_name', label: 'App', type: 'text', placeholder: '' },
        { key: 'requested_scopes', label: 'Requested Scopes', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiPrivacyRiskScore(v)}
    />
  );
}
