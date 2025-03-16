export const getOfficialDashboard = (department) => {
    switch (department) {
        case 'Water':
            return '/official-dashboard/water';
        case 'RTO':
            return '/official-dashboard/rto';
        case 'Electricity':
            return '/official-dashboard/electricity';
    }
};
