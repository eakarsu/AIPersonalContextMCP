import React from 'react';
import CrudPage from '../components/CrudPage';
import { schemasApi } from '../services/api';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'fields_summary', label: 'Fields Summary', type: 'textarea' },
  { key: 'version', label: 'Version', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ["active","draft","archived"] }
];

export default function SchemasPage() {
  return (
    <CrudPage
      title="Schemas"
      subtitle="Manage schemas records"
      api={schemasApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
