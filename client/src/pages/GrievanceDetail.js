import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const GrievanceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGrievanceDetails();
  }, [id]);

  const fetchGrievanceDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/grievances/${id}`, {
        withCredentials: true
      });
      setGrievance(response.data);
    } catch (err) {
      console.error('Error fetching grievance details:', err);
      setError(err.response?.data?.message || 'Failed to fetch grievance details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'In Progress':
        return 'info';
      case 'Resolved':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          variant="outlined"
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!grievance) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">Grievance not found</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          variant="outlined"
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/dashboard')}
        variant="outlined"
        sx={{ mb: 3 }}
      >
        Back to Dashboard
      </Button>

      <Paper sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Grievance Details
          </Typography>
          <Chip
            label={grievance.status}
            color={getStatusColor(grievance.status)}
            sx={{ fontSize: '1rem', py: 2, px: 1 }}
          />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              {grievance.title}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography color="textSecondary" gutterBottom>
              Department
            </Typography>
            <Typography variant="body1" gutterBottom>
              {grievance.department}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography color="textSecondary" gutterBottom>
              Location
            </Typography>
            <Typography variant="body1" gutterBottom>
              {grievance.location}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography color="textSecondary" gutterBottom>
              Description
            </Typography>
            <Typography variant="body1" paragraph>
              {grievance.description}
            </Typography>
          </Grid>

          {grievance.attachments && grievance.attachments.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography color="textSecondary" gutterBottom>
                Attachments
              </Typography>
              {grievance.attachments.map((attachment, index) => (
                <Box key={index} sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    {attachment.filename}
                  </Typography>
                </Box>
              ))}
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography color="textSecondary" variant="body2">
                  Submitted by: {grievance.user?.name}
                </Typography>
                <Typography color="textSecondary" variant="body2">
                  Date: {new Date(grievance.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
              {grievance.updatedAt !== grievance.createdAt && (
                <Typography color="textSecondary" variant="body2">
                  Last updated: {new Date(grievance.updatedAt).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default GrievanceDetail; 