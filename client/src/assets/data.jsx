export const chartData = [
    { name: "Completed", total: 5 },
    { name: "In Progress", total: 4 },
    { name: "Pending", total: 3 }
];

export const summary = {
    totalTasks: 12,
    tasks: {
        completed: 5,
        "in progress": 4,
        todo: 3
    },
    users: [
        { name: "Alice Johnson", role: "Admin", isActive: true, createdAt: "2024-01-15" },
        { name: "Bob Smith", role: "Official", isActive: false, createdAt: "2024-02-10" }
    ],
    last10Task: [
        { title: "Review Complaint", priority: "high", team: [{ name: "Alice" }], date: "2024-02-12", stage: "todo" },
        { title: "Investigate Issue", priority: "medium", team: [{ name: "Bob" }], date: "2024-02-14", stage: "in progress" }
    ]
};
