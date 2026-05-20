import React from 'react';
import CrudPage from '../components/CrudPage';
import { data_sourcesApi } from '../services/api';

const FIELDS = [
  { key: 'connector_name', label: 'Connector', type: 'text' },
  { key: 'source_type', label: 'Type', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ["active","paused"] },
  { key: 'schema_name', label: 'Schema', type: 'text' }
];

export default function DataSourcesPage() {
  return (
    <CrudPage
      title="Data Sources"
      subtitle="Manage data sources records"
      api={data_sourcesApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
