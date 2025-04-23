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
  Visibility as VisibilityIcon
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
      const response = await axios.get(`http://localhost:5000/api/grievances/${id}`);
      setGrievance(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching grievance details:', err);
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
      const response = await axios.get(`http://localhost:5000/api/documents/${file._id}`, {
        responseType: 'blob'
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
      setError('Failed to download file');
    }
  };

  const handleView = async (file) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/documents/${file._id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setSelectedDocument(url);
      setViewerOpen(true);
    } catch (err) {
      console.error('Error viewing file:', err);
      setError('Failed to view file');
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
              <Typography variant="h6" gutterBottom>
                Resolution Document
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <DescriptionIcon />
                  </ListItemIcon>
                  <ListItemText primary={grievance.resolutionDocument.filename} />
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownload(grievance.resolutionDocument)}
                    sx={{ mr: 1 }}
                  >
                    Download
                  </Button>
                  <Button
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleView(grievance.resolutionDocument)}
                  >
                    View
                  </Button>
                </ListItem>
              </List>
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
      >
        <DialogContent sx={{ position: 'relative', p: 0, height: '80vh' }}>
          <IconButton
            onClick={() => {
              setViewerOpen(false);
              setSelectedDocument(null);
            }}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
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
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Document Viewer"
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default GrievanceDetail; 