import React from 'react';
import RetrievalFrequencyChart from '../components/customViews/RetrievalFrequencyChart';
import SourceQueryHeatmap from '../components/customViews/SourceQueryHeatmap';
import ContextProfilePDF from '../components/customViews/ContextProfilePDF';
import RetrievalRulesEditor from '../components/customViews/RetrievalRulesEditor';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page">
      <div className="page-header">
        <div>
          <h2>Context Views</h2>
          <p>
            Domain-specific analytics and editorial tools for the Personal Context layer:
            retrieval frequency, source-vs-query intensity, profile export, and per-source
            retrieval rules.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 16 }}>
        <RetrievalFrequencyChart />
        <SourceQueryHeatmap />
        <ContextProfilePDF />
        <RetrievalRulesEditor />
      </div>
    </div>
  );
}
