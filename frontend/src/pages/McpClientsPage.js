import React from 'react';
import CrudPage from '../components/CrudPage';
import { mcp_clientsApi } from '../services/api';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'public_key', label: 'Public Key (fingerprint)', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ["active","revoked"] },
  { key: 'last_used', label: 'Last Used', type: 'datetime-local' }
];

export default function McpClientsPage() {
  return (
    <CrudPage
      title="MCP Clients"
      subtitle="Manage mcp clients records"
      api={mcp_clientsApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
