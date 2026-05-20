import React from 'react';
import AIPage from '../components/AIPage';
import { aiAuditLog } from '../services/api';

export default function AIAuditLogPage() {
  return (
    <AIPage
      title="AI · Audit Disclosure Log"
      feature="audit-log"
      subtitle="Audit Disclosure Log"
      inputs={[
        { key: 'time_range', label: 'Range', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiAuditLog(v)}
    />
  );
}
