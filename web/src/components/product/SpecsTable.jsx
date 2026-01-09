import React from 'react';

const SpecsTable = ({ specifications }) => {
  if (!specifications || specifications.length === 0) return null;

  return (
    <div className="mt-8 border-t pt-8">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Especificações Técnicas</h3>
      <div className="border rounded-lg overflow-hidden">
        {specifications.map((spec, index) => (
          <div 
            key={index} 
            className={`flex flex-col sm:flex-row p-4 ${
              index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <div className="sm:w-1/3 font-bold text-gray-700 mb-1 sm:mb-0">
              {spec.label}
            </div>
            <div className="sm:w-2/3 text-gray-600">
              {spec.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpecsTable;