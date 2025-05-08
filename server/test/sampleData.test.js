import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function insertSampleData() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        const db = client.db();
        const collection = db.collection('grievances');

        // Generate sample data
        const departments = ['Water', 'Electricity', 'RTO'];
        const statuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'];
        const priorities = ['HIGH', 'MEDIUM', 'LOW'];
        
        const sampleData = [];
        
        // Generate data for the last 90 days
        for (let i = 0; i < 100; i++) {
            const randomDays = Math.floor(Math.random() * 90);
            const date = new Date();
            date.setDate(date.getDate() - randomDays);
            
            const isEscalated = Math.random() < 0.2; // 20% chance of being escalated
            const status = isEscalated ? 'ESCALATED' : statuses[Math.floor(Math.random() * (statuses.length - 1))];
            const escalationLevel = isEscalated ? Math.floor(Math.random() * 3) + 1 : 0;
            
            sampleData.push({
                department: departments[Math.floor(Math.random() * departments.length)],
                status: status,
                priority: priorities[Math.floor(Math.random() * priorities.length)],
                createdAt: date,
                updatedAt: date,
                title: `Sample Grievance ${i + 1}`,
                description: `This is a sample grievance for testing Hadoop integration`,
                petitionId: `GRV${Date.now().toString().slice(-6)}-${i}`,
                location: 'Test Location',
                priorityExplanation: 'Test priority',
                impactAssessment: 'Test impact',
                recommendedResponseTime: '24h',
                isEscalated: isEscalated,
                escalationLevel: escalationLevel,
                escalatedAt: isEscalated ? date : null,
                escalationReason: isEscalated ? 'Delayed response' : null
            });
        }

        // Insert the sample data
        console.log('Inserting sample data...');
        const result = await collection.insertMany(sampleData);
        console.log(`Inserted ${result.insertedCount} documents`);

        // Verify the data
        const count = await collection.countDocuments();
        console.log(`Total documents in collection: ${count}`);

        // Show sample of inserted data
        const sample = await collection.find().limit(2).toArray();
        console.log('\nSample of inserted data:');
        console.log(JSON.stringify(sample, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

// Run the insertion
console.log('Starting sample data insertion...');
insertSampleData().then(() => {
    console.log('\nSample data insertion completed');
});
