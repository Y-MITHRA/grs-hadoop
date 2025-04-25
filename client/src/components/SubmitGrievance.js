import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Grid,
  IconButton,
  Tooltip,
  CircularProgress,
  FormControl,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import LocationDropdowns from './LocationDropdowns';

const SubmitGrievance = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    department: 'Water',
    description: '',
    district: '',
    division: '',
    taluk: '',
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field if it exists
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

    // Clear errors for location fields
    const updatedErrors = { ...errors };
    if (district && updatedErrors.district) delete updatedErrors.district;
    if (division && updatedErrors.division) delete updatedErrors.division;
    if (taluk && updatedErrors.taluk) delete updatedErrors.taluk;
    setErrors(updatedErrors);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => {
      const isValidType = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      return isValidType && isValidSize;
    });

    if (validFiles.length !== selectedFiles.length) {
      toast.error('Some files were rejected. Please ensure files are PDF, DOC, DOCX, JPG, or PNG and under 5MB.');
    }

    setFiles(validFiles);
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

    setLoading(true);

    try {
      // Create the grievance data
      const grievanceData = {
        title: formData.title.trim(),
        department: formData.department,
        description: formData.description.trim(),
        district: formData.district,
        division: formData.division,
        taluk: formData.taluk
      };

      // Log what we're sending for debugging
      console.log('Submitting grievance with data:', {
        ...grievanceData,
        description: grievanceData.description.substring(0, 20) + '...',
        attachments: files.length
      });

      let response;

      // For file uploads, create better FormData
      if (files.length > 0) {
        console.log('Using endpoint with attachments');
        const formDataToSend = new FormData();

        // Add grievance data to FormData one by one
        formDataToSend.append('title', grievanceData.title);
        formDataToSend.append('department', grievanceData.department);
        formDataToSend.append('description', grievanceData.description);
        formDataToSend.append('district', grievanceData.district);
        formDataToSend.append('division', grievanceData.division);
        formDataToSend.append('taluk', grievanceData.taluk);

        // Add files to FormData
        files.forEach(file => {
          formDataToSend.append('attachments', file);
        });

        console.log('FormData keys:', [...formDataToSend.keys()]);

        response = await axios.post(
          'http://localhost:5000/api/grievances/with-attachments',
          formDataToSend,
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${token}`
            },
          }
        );
      } else {
        // No files - use regular JSON endpoint
        console.log('Using standard endpoint (no attachments)');
        response = await axios.post(
          'http://localhost:5000/api/grievances',
          grievanceData,
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
          }
        );
      }

      console.log('Grievance submission successful:', response.data);
      toast.success('Grievance submitted successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Submission error:', err);
      // Extract detailed error message from response if available
      const errorDetail = err.response?.data?.error || err.response?.data?.message || 'Failed to submit grievance';
      const missingFields = err.response?.data?.missingFields;

      if (missingFields) {
        console.error('Missing fields:', missingFields);
      }

      setErrors({ form: errorDetail });
      toast.error(errorDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Submit New Grievance
          </Typography>

          {errors.form && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.form}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Petitioner Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={user.name}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={user.email}
                  disabled
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Grievance Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  error={!!errors.title}
                  helperText={errors.title}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <TextField
                    label="Department"
                    name="department"
                    value="Water"
                    disabled
                    fullWidth
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <LocationDropdowns
                    onLocationChange={handleLocationChange}
                    initialValues={{
                      district: formData.district,
                      division: formData.division,
                      taluk: formData.taluk
                    }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  placeholder="Provide detailed description of your grievance"
                  error={!!errors.description}
                  helperText={errors.description}
                />
              </Grid>
            </Grid>

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
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload">
                <Button
                  component="span"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  sx={{ mt: 1 }}
                >
                  Choose Files
                </Button>
              </label>
              {files.length > 0 && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {files.length} file(s) selected
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Submitting...
                  </>
                ) : (
                  'Submit Grievance'
                )}
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
      </Box>
    </Container>
  );
};

export default SubmitGrievance; 