import React from 'react';
import CrudPage from '../components/CrudPage';
import { app_consentsApi } from '../services/api';

const FIELDS = [
  { key: 'app_name', label: 'App', type: 'text' },
  { key: 'scope', label: 'Scope', type: 'text' },
  { key: 'allowed_fields', label: 'Allowed Fields', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ["active","revoked","expired"] },
  { key: 'expires_at', label: 'Expires', type: 'datetime-local' }
];

export default function AppConsentsPage() {
  return (
    <CrudPage
      title="App Consents"
      subtitle="Manage app consents records"
      api={app_consentsApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
