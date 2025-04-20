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
  Grid,
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import LocationDropdowns from '../components/LocationDropdowns';

const GrievanceForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    department: 'RTO',
    description: '',
    district: '',
    division: '',
    taluk: '',
    attachments: []
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any errors for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleLocationChange = ({ district, division, taluk }) => {
    setFormData(prev => ({
      ...prev,
      district,
      division,
      taluk
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
      isValid = false;
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    }

    if (!formData.district.trim()) {
      newErrors.district = 'District is required';
      isValid = false;
    }

    if (!formData.division.trim()) {
      newErrors.division = 'Division is required';
      isValid = false;
    }

    if (!formData.taluk.trim()) {
      newErrors.taluk = 'Taluk is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
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
      formDataToSend.append('district', formData.district);
      formDataToSend.append('division', formData.division);
      formDataToSend.append('taluk', formData.taluk);

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

          <Box sx={{ my: 2 }}>
            <LocationDropdowns
              onLocationChange={handleLocationChange}
              initialValues={{
                district: formData.district,
                division: formData.division,
                taluk: formData.taluk
              }}
            />
          </Box>

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

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Additional Attachments
            </Typography>
            <Typography variant="caption" display="block" gutterBottom color="text.secondary">
              Max file size: 5MB. Supported formats: PDF, DOC, DOCX, JPG, PNG
            </Typography>
            <input
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files);
                setFormData(prev => ({
                  ...prev,
                  attachments: files
                }));
              }}
            />
            <label htmlFor="file-upload">
              <Button
                component="span"
                variant="outlined"
                startIcon={<UploadIcon />}
                sx={{ mt: 1 }}
              >
                Choose Files
              </Button>
            </label>
            {formData.attachments.length > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {formData.attachments.length} file(s) selected
              </Typography>
            )}
          </Box>

          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Grievance'}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              onClick={() => navigate('/dashboard')}
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