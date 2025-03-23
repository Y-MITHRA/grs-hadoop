import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Stack,
  Paper,
} from '@mui/material';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import TimelineIcon from '@mui/icons-material/Timeline';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: <WaterDropIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Report Water Issues',
      description: 'Submit complaints about water supply, quality, leakage, or any other water-related problems.',
    },
    {
      icon: <TimelineIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Track Progress',
      description: 'Monitor the status of your grievances in real-time with our transparent tracking system.',
    },
    {
      icon: <SupportAgentIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Quick Resolution',
      description: 'Get faster response and resolution for your water-related issues from our dedicated team.',
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(45deg, #2196f3 30%, #03a9f4 90%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          mb: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                }}
              >
                Water Grievance Portal
              </Typography>
              <Typography
                variant="h5"
                sx={{ mb: 4, opacity: 0.9, lineHeight: 1.5 }}
              >
                Your voice matters. Report water-related issues and track their resolution through our streamlined platform.
              </Typography>
              {!user ? (
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    onClick={() => navigate('/register')}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    Get Started
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="large"
                    onClick={() => navigate('/login')}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    Login
                  </Button>
                </Stack>
              ) : (
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={() => navigate('/dashboard')}
                  sx={{ px: 4, py: 1.5 }}
                >
                  Go to Dashboard
                </Button>
              )}
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography
          variant="h2"
          align="center"
          gutterBottom
          sx={{ mb: 6, fontWeight: 600 }}
        >
          Why Choose Our Portal?
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            align="center"
            gutterBottom
            sx={{ mb: 6, fontWeight: 600 }}
          >
            How It Works
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  height: '100%',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Typography
                  variant="h2"
                  color="primary"
                  sx={{ mb: 2, fontWeight: 700 }}
                >
                  1
                </Typography>
                <Typography variant="h5" gutterBottom>
                  Register
                </Typography>
                <Typography color="text.secondary">
                  Create your account with basic information to get started
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  height: '100%',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Typography
                  variant="h2"
                  color="primary"
                  sx={{ mb: 2, fontWeight: 700 }}
                >
                  2
                </Typography>
                <Typography variant="h5" gutterBottom>
                  Submit Grievance
                </Typography>
                <Typography color="text.secondary">
                  File your complaint with detailed information about the issue
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  height: '100%',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Typography
                  variant="h2"
                  color="primary"
                  sx={{ mb: 2, fontWeight: 700 }}
                >
                  3
                </Typography>
                <Typography variant="h5" gutterBottom>
                  Track Progress
                </Typography>
                <Typography color="text.secondary">
                  Monitor the status and updates of your grievance in real-time
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Home; 