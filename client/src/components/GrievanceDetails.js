import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    Box,
    Chip,
    Button,
    Grid,
    CircularProgress,
    Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import GrievanceTimeline from './GrievanceTimeline';

const GrievanceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchGrievanceDetails();
    }, [id]);

    const fetchGrievanceDetails = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/grievances/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setGrievance(response.data);
            setError('');
        } catch (err) {
            console.error('Error fetching grievance details:', err);
            setError('Failed to fetch grievance details. ' + (err.response?.data?.message || err.message));
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
            <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Typography color="error">{error}</Typography>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/dashboard')}
                    sx={{ mt: 2 }}
                >
                    Back to Dashboard
                </Button>
            </Container>
        );
    }

    if (!grievance) {
        return (
            <Container sx={{ mt: 4 }}>
                <Typography>Grievance not found</Typography>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/dashboard')}
                    sx={{ mt: 2 }}
                >
                    Back to Dashboard
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/dashboard')}
                sx={{ mb: 3 }}
            >
                Back to Dashboard
            </Button>

            <Paper elevation={3} sx={{ p: 4 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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

                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" color="text.secondary">
                            Department
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            {grievance.department}
                        </Typography>

                        <Typography variant="subtitle1" color="text.secondary">
                            Location
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            {`${grievance.taluk}, ${grievance.division}, ${grievance.district}`}
                        </Typography>

                        <Typography variant="subtitle1" color="text.secondary">
                            Submitted On
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            {new Date(grievance.createdAt).toLocaleDateString()}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" color="text.secondary">
                            Description
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                            {grievance.description}
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 3 }} />
                        <Typography variant="h5" sx={{ mb: 3 }}>
                            Timeline
                        </Typography>
                        <GrievanceTimeline timeline={grievance.timeline || []} />
                    </Grid>
                </Grid>
            </Paper>
        </Container>
    );
};

export default GrievanceDetails; 