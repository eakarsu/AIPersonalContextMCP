import React from 'react';
import CrudPage from '../components/CrudPage';
import { redaction_rulesApi } from '../services/api';

const FIELDS = [
  { key: 'field', label: 'Field', type: 'text' },
  { key: 'rule', label: 'Rule', type: 'textarea' },
  { key: 'reason', label: 'Reason', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ["active","draft"] }
];

export default function RedactionRulesPage() {
  return (
    <CrudPage
      title="Redaction Rules"
      subtitle="Manage redaction rules records"
      api={redaction_rulesApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
