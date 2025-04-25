import React from 'react';
import { useLocationDropdowns } from '../hooks/useLocationDropdowns';
import { FormControl, Grid, MenuItem, TextField } from '@mui/material';

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
        <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                    <TextField
                        select
                        label="District *"
                        value={selectedDistrict || initialValues.district || ''}
                        onChange={handleDistrictSelect}
                        required
                        error={!selectedDistrict && initialValues.district === ''}
                    >
                        <MenuItem value="">Select District</MenuItem>
                        {districts.map((district) => (
                            <MenuItem key={district} value={district}>
                                {district}
                            </MenuItem>
                        ))}
                    </TextField>
                </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                    <TextField
                        select
                        label="Division *"
                        value={selectedDivision || initialValues.division || ''}
                        onChange={handleDivisionSelect}
                        required
                        disabled={!selectedDistrict}
                        error={!selectedDivision && initialValues.division === ''}
                    >
                        <MenuItem value="">Select Division</MenuItem>
                        {divisions.map((division) => (
                            <MenuItem key={division} value={division}>
                                {division}
                            </MenuItem>
                        ))}
                    </TextField>
                </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                    <TextField
                        select
                        label="Taluk *"
                        value={selectedTaluk || initialValues.taluk || ''}
                        onChange={handleTalukSelect}
                        required
                        disabled={!selectedDivision}
                        error={!selectedTaluk && initialValues.taluk === ''}
                    >
                        <MenuItem value="">Select Taluk</MenuItem>
                        {taluks.map((taluk) => (
                            <MenuItem key={taluk} value={taluk}>
                                {taluk}
                            </MenuItem>
                        ))}
                    </TextField>
                </FormControl>
            </Grid>
        </Grid>
    );
};

export default LocationDropdowns; 