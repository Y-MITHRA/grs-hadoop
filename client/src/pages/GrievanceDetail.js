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
  IconButton,
  Dialog,
  DialogContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Description as DescriptionIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const GrievanceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  useEffect(() => {
    fetchGrievanceDetails();
  }, [id]);

  const fetchGrievanceDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/grievances/${id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });
      
      if (!response.data) {
        throw new Error('No data received from server');
      }

      // Log the response for debugging
      console.log('Grievance details:', response.data);
      console.log('Resolution document:', response.data.resolutionDocument);
      
      // Check if this is a resolved grievance from the main portal
      if (response.data.status === 'resolved' && response.data.resolutionDocument) {
        console.log('Found resolution document:', response.data.resolutionDocument);
      }
      
      setGrievance(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        stack: err.stack
      });
      setError(err.response?.data?.message || 'Failed to fetch grievance details');
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'IN_PROGRESS':
        return 'info';
      case 'RESOLVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleDownload = async (file) => {
    try {
      if (!file) {
        console.error('Invalid file object:', file);
        setError('Invalid document reference');
        return;
      }

      // Extract filename from path for resolution documents
      const filename = file.path ? file.path.split('/').pop() : null;
      
      // Use proxy route for resolution documents, regular route for attachments
      const documentUrl = file._id 
        ? `http://localhost:5001/api/documents/${file._id}/download`
        : `http://localhost:5001/api/documents/resolution/${filename}`;

      const response = await axios.get(documentUrl, {
        responseType: 'blob',
        withCredentials: true
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file. ' + (err.response?.data?.message || err.message));
    }
  };

  const handleView = async (file) => {
    try {
      if (!file) {
        console.error('Invalid file object:', file);
        setError('Invalid document reference');
        return;
      }

      // Extract filename from path for resolution documents
      const filename = file.path ? file.path.split('/').pop() : null;
      
      // Use proxy route for resolution documents, regular route for attachments
      const documentUrl = file._id 
        ? `http://localhost:5001/api/documents/${file._id}/view`
        : `http://localhost:5001/api/documents/resolution/${filename}`;
      
      console.log('Attempting to view document:', documentUrl);

      const response = await axios.get(documentUrl, {
        responseType: 'blob',
        withCredentials: true
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setSelectedDocument(url);
      setViewerOpen(true);
    } catch (err) {
      console.error('Error viewing file:', err);
      setError('Failed to view file. ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
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

      <Paper elevation={3} sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h4" component="h1">
                {grievance.title}
              </Typography>
              <Chip
                label={grievance.status}
                color={getStatusColor(grievance.status)}
                sx={{ ml: 2 }}
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="body1" paragraph>
              {grievance.description}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Department: {grievance.department}
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              Location: {grievance.location}
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              Submitted: {new Date(grievance.createdAt).toLocaleDateString()}
            </Typography>
            {grievance.updatedAt && (
              <Typography variant="subtitle1" gutterBottom>
                Last Updated: {new Date(grievance.updatedAt).toLocaleDateString()}
              </Typography>
            )}
          </Grid>

          {grievance.attachments && grievance.attachments.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Attachments
              </Typography>
              <List>
                {grievance.attachments.map((file, index) => (
                  <React.Fragment key={file._id}>
                    <ListItem>
                      <ListItemIcon>
                        <AttachFileIcon />
                      </ListItemIcon>
                      <ListItemText primary={file.filename} />
                      <Button
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownload(file)}
                        sx={{ mr: 1 }}
                      >
                        Download
                      </Button>
                      <Button
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleView(file)}
                      >
                        View
                      </Button>
                    </ListItem>
                    {index < grievance.attachments.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Grid>
          )}

          {grievance.resolutionDocument && (
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Resolution Document
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  This document contains the official resolution for your grievance.
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <DescriptionIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={grievance.resolutionDocument.filename}
                      secondary={`Uploaded on ${new Date(grievance.resolutionDocument.uploadedAt).toLocaleDateString()}`}
                    />
                    <Button
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload(grievance.resolutionDocument)}
                      variant="outlined"
                      sx={{ mr: 1 }}
                    >
                      Download
                    </Button>
                    <Button
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleView(grievance.resolutionDocument)}
                      variant="contained"
                      color="primary"
                    >
                      View Document
                    </Button>
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Dialog
        open={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          setSelectedDocument(null);
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogContent sx={{ position: 'relative', p: 0, height: '100%' }}>
          <IconButton
            onClick={() => {
              setViewerOpen(false);
              setSelectedDocument(null);
            }}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 1,
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
          {selectedDocument && (
            <iframe
              src={selectedDocument}
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none',
                display: 'block'
              }}
              title="Document Viewer"
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default GrievanceDetail; 