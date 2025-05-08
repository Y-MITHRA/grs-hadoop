import fs from 'fs';
import path from 'path';
import { mockGrievances } from '../test/mockData.js';

class DataTransfer {
    async exportToHDFS(collection, query) {
        try {
            // For testing, use mock data
            const filteredData = mockGrievances.filter(grievance => {
                // Apply MongoDB-style query filters
                for (const [field, condition] of Object.entries(query)) {
                    if (condition.$regex) {
                        const regex = new RegExp(condition.$regex, condition.$options);
                        if (!regex.test(grievance[field])) {
                            return false;
                        }
                    }
                }
                return true;
            });

            // Create test directories if they don't exist
            const testDir = path.join(process.cwd(), 'test_data');
            const inputDir = path.join(testDir, 'input');
            fs.mkdirSync(inputDir, { recursive: true });

            // Write filtered data to a temporary file
            const timestamp = Date.now();
            const hdfsPath = path.join(inputDir, `grievances_${timestamp}`);
            const localPath = path.join(testDir, `input_${timestamp}.json`);

            fs.writeFileSync(localPath, JSON.stringify(filteredData, null, 2));

            // In a real implementation, we would use HDFS commands here
            // For testing, we'll just use the local file system
            fs.mkdirSync(hdfsPath, { recursive: true });
            fs.copyFileSync(localPath, path.join(hdfsPath, 'data.json'));
            fs.unlinkSync(localPath);

            return hdfsPath;
        } catch (error) {
            console.error('Error exporting data to HDFS:', error);
            throw error;
        }
    }

    async importFromHDFS(hdfsPath, localPath) {
        try {
            // In a real implementation, we would use HDFS commands here
            // For testing, we'll just use the local file system
            const dataPath = path.join(hdfsPath, 'data.json');
            if (fs.existsSync(dataPath)) {
                const data = fs.readFileSync(dataPath, 'utf8');
                fs.writeFileSync(localPath, data);
                return JSON.parse(data);
            }
            return [];
        } catch (error) {
            console.error('Error importing data from HDFS:', error);
            throw error;
        }
    }
}

export default new DataTransfer();
