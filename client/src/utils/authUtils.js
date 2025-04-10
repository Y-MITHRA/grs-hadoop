export const getRedirectPath = (userType, department = null) => {
    switch (userType) {
        case 'petitioner':
            return '/petitioner/dashboard';
        case 'admin':
            return '/admin/dashboard';
        case 'official':
            if (department) {
                return `/official-dashboard/${department.toLowerCase()}`;
            }
            return '/official-dashboard';
        default:
            return '/';
    }
}; 