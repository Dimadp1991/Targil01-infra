/**
 * Gogs Webhook Receiver
 * This Node.js server receives webhook events from Gogs and triggers deployments
 * Optimized for PR Closed & Merged events
 */

const http = require('http');
const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = 'gogs';
const DEPLOY_SCRIPT = path.join(__dirname, 'deploy.sh');

// Logging function
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);

    const logFile = path.join(__dirname, '..', 'webhook.log');
    fs.appendFileSync(logFile, logMessage + '\n');
}

// Execute deployment script
function triggerDeployment(payload, eventType) {
    return new Promise((resolve, reject) => {
        // For PRs, the SHA is usually in merge_commit_sha or the head of the branch
        let commitSha = 'latest';
        if (eventType === 'pull_request') {
            commitSha = payload.pull_request.merge_commit_sha?.substring(0, 7) ||
                payload.pull_request.head_sha?.substring(0, 7) || 'latest';
        } else {
            commitSha = payload.after?.substring(0, 7) || 'latest';
        }

        const jenkinsUrl = 'http://jenkins:8080';
        const jobName = 'EmptyJob';
        const apiToken = '1171eebb7777de71c032212fe88e872ac0';
        const user = 'root';

        log(`Triggering Jenkins job: ${jobName} for PR commit ${commitSha}`);

        const url = `${jenkinsUrl}/job/${jobName}/buildWithParameters?token=${apiToken}&COMMIT_SHA=${commitSha}`;
        const auth = Buffer.from(`${user}:${apiToken}`).toString('base64');

        const req = http.request(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        }, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                log(`Jenkins signaled successfully (Status: ${res.statusCode})`, 'SUCCESS');
                resolve();
            } else {
                log(`Jenkins returned error: ${res.statusCode}`, 'ERROR');
                reject(new Error(`Jenkins error: ${res.statusCode}`));
            }
        });

        req.on('error', (err) => {
            log(`Failed to connect to Jenkins: ${err.message}`, 'ERROR');
            reject(err);
        });

        req.end();
    });
}

const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });

    req.on('end', () => {
        try {
            const payload = JSON.parse(body);
            const event = req.headers['x-gogs-event'];

            log(`Received ${event} event from Gogs`);

            if (event === 'pull_request') {
                const action = payload.action; // 'opened', 'closed', 'reopened', etc.
                const merged = payload.pull_request.merged;

                if (action === 'closed' && merged === true) {
                    log(`PR #${payload.number} MERGED into ${payload.pull_request.base_branch}. Triggering build.`);

                    triggerDeployment(payload, 'pull_request')
                        .then(() => log('Deployment triggered successfully', 'SUCCESS'))
                        .catch((error) => log(`Deployment failed: ${error.message}`, 'ERROR'));

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'success', message: 'PR Merge detected, build triggered' }));
                } else {
                    log(`PR event ignored. Action: ${action}, Merged: ${merged}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ignored', message: 'Only merged PRs trigger builds' }));
                }
            } else {
                log(`Event ${event} ignored. Script is configured for pull_request events only.`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ignored', message: 'Not a PR event' }));
            }
            // --- CHANGED LOGIC END ---

        } catch (error) {
            log(`Error processing webhook: ${error.message}`, 'ERROR');
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
});

server.listen(PORT, () => {
    log(`Webhook receiver listening on port ${PORT}`);
});