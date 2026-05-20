import React from 'react';
import CrudPage from '../components/CrudPage';
import { connectorsApi } from '../services/api';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'provider', label: 'Provider', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ["connected","disconnected","error"] },
  { key: 'last_synced', label: 'Last Synced', type: 'datetime-local' }
];

export default function ConnectorsPage() {
  return (
    <CrudPage
      title="Connectors"
      subtitle="Manage connectors records"
      api={connectorsApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
