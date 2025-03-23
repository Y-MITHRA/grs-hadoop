import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchGrievances();
  }, []);

  const fetchGrievances = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/grievances', {
        withCredentials: true
      });
      console.log('Fetched grievances:', response.data);
      setGrievances(response.data);
    } catch (err) {
      setError('Failed to fetch grievances');
      console.error('Error fetching grievances:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in-progress':
        return 'info';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Welcome, {user.name}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/submit-grievance')}
        >
          Submit New Grievance
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '20%' }}>Title</TableCell>
              <TableCell sx={{ width: '15%' }}>Department</TableCell>
              <TableCell sx={{ width: '25%' }}>Location</TableCell>
              <TableCell sx={{ width: '15%' }}>Status</TableCell>
              <TableCell sx={{ width: '15%' }}>Submitted On</TableCell>
              <TableCell sx={{ width: '10%' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grievances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No grievances found. Submit your first grievance!
                </TableCell>
              </TableRow>
            ) : (
              grievances.map((grievance) => (
                <TableRow key={grievance._id}>
                  <TableCell sx={{ maxWidth: '20%', wordBreak: 'break-word' }}>{grievance.title}</TableCell>
                  <TableCell sx={{ maxWidth: '15%', wordBreak: 'break-word' }}>{grievance.department}</TableCell>
                  <TableCell sx={{ maxWidth: '25%', wordBreak: 'break-word' }}>{grievance.location}</TableCell>
                  <TableCell sx={{ maxWidth: '15%' }}>
                    <Chip
                      label={grievance.status}
                      color={getStatusColor(grievance.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: '15%' }}>
                    {new Date(grievance.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ maxWidth: '10%' }}>
                    <Tooltip title="View Details">
                      <IconButton
                        color="primary"
                        onClick={() => navigate(`/grievance/${grievance._id}`)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default Dashboard; 