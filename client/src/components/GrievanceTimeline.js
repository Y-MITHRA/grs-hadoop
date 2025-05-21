import React from 'react';
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineOppositeContent,
} from '@mui/lab';
import { Paper, Typography } from '@mui/material';

const GrievanceTimeline = ({ timeline }) => {
    if (!timeline || timeline.length === 0) {
        return (
            <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    No timeline entries available
                </Typography>
            </Paper>
        );
    }

    return (
        <Timeline position="alternate">
            {timeline.map((entry, index) => (
                <TimelineItem key={index}>
                    <TimelineOppositeContent color="text.secondary">
                        {new Date(entry.date).toLocaleDateString()}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                        <TimelineDot color="primary" />
                        {index < timeline.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                        <Paper elevation={3} sx={{ p: 2 }}>
                            <Typography variant="h6" component="h3">
                                {entry.stage}
                            </Typography>
                            <Typography>{entry.description}</Typography>
                        </Paper>
                    </TimelineContent>
                </TimelineItem>
            ))}
        </Timeline>
    );
};

export default GrievanceTimeline; 