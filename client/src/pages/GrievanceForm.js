import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const GrievanceForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    description: '',
    location: ''
  });

  const departments = [
    'License',
    'Registration',
    'Vehicle',
    'Permits',
    'Enforcement',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        e.target.value = ''; // Clear the file input
        return;
      }
      
      // Check file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Supported formats: PDF, DOC, DOCX, JPG, PNG');
        e.target.value = ''; // Clear the file input
        return;
      }
      
      setSelectedFile(file);
      setError('');
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.department) {
      setError('Department is required');
      return false;
    }
    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('department', formData.department);
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('location', formData.location.trim());
      
      if (selectedFile) {
        formDataToSend.append('attachment', selectedFile);
      }

      const response = await axios.post('http://localhost:5000/api/grievances', formDataToSend, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error submitting grievance:', err);
      setError(err.response?.data?.message || 'Failed to submit grievance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Submit New Grievance
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          {/* Petitioner Details Section */}
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Petitioner Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={user?.name || ''}
                disabled
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                value={user?.email || ''}
                disabled
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>

          {/* Grievance Details Section */}
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Grievance Details
          </Typography>
          
          <TextField
            fullWidth
            required
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel>Department</InputLabel>
            <Select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              label="Department"
            >
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            required
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="Enter RTO office location or relevant address"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            required
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            multiline
            rows={4}
            sx={{ mb: 2 }}
          />

          {/* Attachments Section */}
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Attachments
          </Typography>
          
          <input
            accept=".pdf,.doc,.docx,.jpg,.png"
            style={{ display: 'none' }}
            id="attachment-file"
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="attachment-file">
            <Button
              variant="outlined"
              component="span"
              fullWidth
              sx={{ mb: 1 }}
            >
              Choose Files
            </Button>
          </label>
          {selectedFile && (
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Selected file: {selectedFile.name}
            </Typography>
          )}
          <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 3 }}>
            Max file size: 5MB. Supported formats: PDF, DOC, DOCX, JPG, PNG
          </Typography>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ minWidth: 150 }}
            >
              Submit Grievance
            </Button>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={loading}
              sx={{ minWidth: 150 }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default GrievanceForm; 