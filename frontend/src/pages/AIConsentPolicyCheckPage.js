import React from 'react';
import AIPage from '../components/AIPage';
import { aiConsentPolicyCheck } from '../services/api';

export default function AIConsentPolicyCheckPage() {
  return (
    <AIPage
      title="AI · Consent Policy Check"
      feature="consent-policy-check"
      subtitle="Consent Policy Check"
      inputs={[
        { key: 'requesting_app', label: 'Requesting App', type: 'text', placeholder: '' },
        { key: 'requested_fields', label: 'Fields', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiConsentPolicyCheck(v)}
    />
  );
}
