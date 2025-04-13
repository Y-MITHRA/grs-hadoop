import { useState, useEffect } from 'react';
import locationData from '../data/locationData.json';

export const useLocationDropdowns = () => {
  const [districts, setDistricts] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [taluks, setTaluks] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedTaluk, setSelectedTaluk] = useState('');

  useEffect(() => {
    // Initialize districts
    setDistricts(locationData.districts.map(district => district.name));
  }, []);

  useEffect(() => {
    // Update divisions when district changes
    if (selectedDistrict) {
      const district = locationData.districts.find(d => d.name === selectedDistrict);
      setDivisions(district ? district.divisions.map(div => div.name) : []);
      setSelectedDivision('');
      setSelectedTaluk('');
    } else {
      setDivisions([]);
      setSelectedDivision('');
      setSelectedTaluk('');
    }
  }, [selectedDistrict]);

  useEffect(() => {
    // Update taluks when division changes
    if (selectedDistrict && selectedDivision) {
      const district = locationData.districts.find(d => d.name === selectedDistrict);
      const division = district?.divisions.find(div => div.name === selectedDivision);
      setTaluks(division ? division.taluks : []);
      setSelectedTaluk('');
    } else {
      setTaluks([]);
      setSelectedTaluk('');
    }
  }, [selectedDistrict, selectedDivision]);

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
  };

  const handleDivisionChange = (division) => {
    setSelectedDivision(division);
  };

  const handleTalukChange = (taluk) => {
    setSelectedTaluk(taluk);
  };

  const resetLocation = () => {
    setSelectedDistrict('');
    setSelectedDivision('');
    setSelectedTaluk('');
  };

  return {
    districts,
    divisions,
    taluks,
    selectedDistrict,
    selectedDivision,
    selectedTaluk,
    handleDistrictChange,
    handleDivisionChange,
    handleTalukChange,
    resetLocation
  };
}; 