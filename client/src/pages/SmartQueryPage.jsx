import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import SmartQueryChatbot from '../components/SmartQueryChatbot';

const SmartQueryPage = () => {
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 100px)',
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 3,
                p: 3
            }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'primary.main' }}>
                    Smart Query Assistant
                </Typography>
                <Typography variant="subtitle1" gutterBottom sx={{ color: 'text.secondary', mb: 3 }}>
                    Ask questions about grievances, resources, and escalations in natural language
                </Typography>
                <SmartQueryChatbot />
            </Box>
        </Container>
    );
};

export default SmartQueryPage; 