export const mapCategoryToDepartment = (category) => {
    const categoryToDepartmentMap = {
        'Water Issue': 'Water',
        'RTO Issue': 'RTO',
        'Electricity Issue': 'Electricity'
    };

    const department = categoryToDepartmentMap[category];
    if (!department) {
        throw new Error('Invalid category');
    }

    return department;
}; 