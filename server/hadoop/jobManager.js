import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

class JobManager {
    async submitJob(config) {
        try {
            const { jobName, inputPath, mapper, reducer, outputPath } = config;
            
            // Build Hadoop streaming command
            const hadoopCommand = `hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-*.jar \
                -D mapred.job.name="${jobName}" \
                -files ${path.join(process.cwd(), 'server/hadoop/mappers', mapper + '.js')},${path.join(process.cwd(), 'server/hadoop/reducers', reducer + '.js')} \
                -input ${inputPath} \
                -output ${outputPath} \
                -mapper "node ${mapper}.js" \
                -reducer "node ${reducer}.js"`;
            
            console.log('Running Hadoop streaming command:', hadoopCommand);
            
            // Execute Hadoop streaming job
            const { stdout, stderr } = await execAsync(hadoopCommand);
            
            console.log('Hadoop job output:', stdout);
            console.log('Hadoop job error:', stderr);
            
            return {
                jobId: null, // In a real implementation, we would get this from Hadoop
                outputPath
            };
            
        } catch (error) {
            console.error('Error submitting Hadoop job:', error);
            throw error;
        }
    }
}

export default new JobManager();
