// ============================================
// FILE: src/components/features/FeatureGrid.js
// ============================================
import React from 'react';
import FeatureCard from './FeatureCard';

function FeatureGrid({ features, onFeatureClick, activeFeature }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
      {features.map((feature) => (
        <FeatureCard
          key={feature.id}
          feature={feature}
          isActive={activeFeature === feature.id}
          onClick={() => onFeatureClick(feature.id)}
        />
      ))}
    </div>
  );
}

export default FeatureGrid;