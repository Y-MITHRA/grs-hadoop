import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Upload as UploadIcon,
  LocationOn as LocationOnIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const GrievanceForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    department: 'RTO',
    description: '',
    location: '',
    coordinates: null,
    attachments: []
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          coordinates: { latitude, longitude }
        }));
        // Get address from coordinates using reverse geocoding
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(response => response.json())
          .then(data => {
            setFormData(prev => ({
              ...prev,
              location: data.display_name
            }));
            toast.success('Location captured successfully!');
          })
          .catch(error => {
            console.error('Error getting address:', error);
            toast.error('Could not get address from coordinates');
          })
          .finally(() => {
            setIsGettingLocation(false);
          });
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Could not get your location. Please enter it manually.');
        setIsGettingLocation(false);
      }
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files) {
      const newAttachments = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          setErrors(prev => ({
            ...prev,
            attachments: 'File size should not exceed 5MB'
          }));
          return;
        }
        newAttachments.push(file);
      }
      setFormData(prev => ({
        ...prev,
        attachments: newAttachments
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('department', formData.department);
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('location', formData.location.trim());
      if (formData.coordinates) {
        formDataToSend.append('coordinates', JSON.stringify(formData.coordinates));
      }

      // Append attachments
      formData.attachments.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5001/api/grievances', formDataToSend, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.message === 'Grievance created successfully') {
        toast.success('Grievance submitted successfully!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit grievance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Submit New Grievance
        </Typography>

        <form onSubmit={handleSubmit}>
          {/* Petitioner Details Section */}
          <Typography variant="h6" gutterBottom>
            Petitioner Details
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={user?.name || ''}
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                value={user?.email || ''}
                disabled
              />
            </Grid>
          </Grid>

          {/* Grievance Details Section */}
          <Typography variant="h6" gutterBottom>
            Grievance Details
          </Typography>

          <TextField
            fullWidth
            required
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={!!errors.title}
            helperText={errors.title}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth margin="normal">
            <TextField
              label="Department"
              name="department"
              value="RTO"
              disabled
              fullWidth
            />
          </FormControl>

          <TextField
            fullWidth
            required
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            error={!!errors.location}
            helperText={errors.location}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    edge="end"
                  >
                    <LocationOnIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            required
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            multiline
            rows={4}
            error={!!errors.description}
            helperText={errors.description}
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Additional Attachments
            </Typography>
            <input
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              id="attachments"
              type="file"
              multiple
              onChange={handleFileChange}
            />
            <label htmlFor="attachments">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                fullWidth
              >
                Choose Files
              </Button>
            </label>
            {errors.attachments && (
              <Typography color="error" variant="caption" display="block">
                {errors.attachments}
              </Typography>
            )}
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
              Max file size: 5MB. Supported formats: PDF, DOC, DOCX, JPG, PNG
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              sx={{ minWidth: 150 }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Grievance'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/dashboard')}
              disabled={isSubmitting}
              sx={{ minWidth: 150 }}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default GrievanceForm; 