import React from 'react';
import CrudPage from '../components/CrudPage';
import { disclosure_logApi } from '../services/api';

const FIELDS = [
  { key: 'app_name', label: 'App', type: 'text' },
  { key: 'fields_disclosed', label: 'Fields', type: 'text' },
  { key: 'purpose', label: 'Purpose', type: 'text' },
  { key: 'disclosed_at', label: 'When', type: 'datetime-local' }
];

export default function DisclosureLogPage() {
  return (
    <CrudPage
      title="Disclosure Log"
      subtitle="Manage disclosure log records"
      api={disclosure_logApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
