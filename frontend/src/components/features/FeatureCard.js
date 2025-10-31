// ============================================
// FILE: src/components/features/FeatureCard.js
// ============================================
import React from 'react';

function FeatureCard({ feature, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl p-6 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border-2 ${
        isActive ? 'border-purple-500' : 'border-transparent hover:border-purple-300'
      }`}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-lg text-4xl">
          {feature.icon}
        </div>
        <h3 className="text-xl font-semibold text-gray-900">{feature.name}</h3>
        <p className="text-sm text-gray-600">{feature.desc}</p>
      </div>
    </button>
  );
}

export default FeatureCard;