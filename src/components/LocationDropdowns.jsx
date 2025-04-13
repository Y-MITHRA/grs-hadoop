import React from 'react';
import { useLocationDropdowns } from '../hooks/useLocationDropdowns';

const LocationDropdowns = ({ onLocationChange, initialValues = {} }) => {
  const {
    districts,
    divisions,
    taluks,
    selectedDistrict,
    selectedDivision,
    selectedTaluk,
    handleDistrictChange,
    handleDivisionChange,
    handleTalukChange
  } = useLocationDropdowns();

  // Handle changes and notify parent component
  const handleDistrictSelect = (e) => {
    const district = e.target.value;
    handleDistrictChange(district);
    onLocationChange({ district, division: '', taluk: '' });
  };

  const handleDivisionSelect = (e) => {
    const division = e.target.value;
    handleDivisionChange(division);
    onLocationChange({ district: selectedDistrict, division, taluk: '' });
  };

  const handleTalukSelect = (e) => {
    const taluk = e.target.value;
    handleTalukChange(taluk);
    onLocationChange({ district: selectedDistrict, division: selectedDivision, taluk });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          District *
        </label>
        <select
          value={selectedDistrict || initialValues.district || ''}
          onChange={handleDistrictSelect}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          required
        >
          <option value="">Select District</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Division *
        </label>
        <select
          value={selectedDivision || initialValues.division || ''}
          onChange={handleDivisionSelect}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          required
          disabled={!selectedDistrict}
        >
          <option value="">Select Division</option>
          {divisions.map((division) => (
            <option key={division} value={division}>
              {division}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Taluk *
        </label>
        <select
          value={selectedTaluk || initialValues.taluk || ''}
          onChange={handleTalukSelect}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          required
          disabled={!selectedDivision}
        >
          <option value="">Select Taluk</option>
          {taluks.map((taluk) => (
            <option key={taluk} value={taluk}>
              {taluk}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LocationDropdowns; 