import { Client, Account, Databases } from 'appwrite';

const client = new Client();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

const isConfigured = Boolean(projectId && projectId !== '');

if (!isConfigured) {
  console.error('Appwrite Project ID is missing! Set VITE_APPWRITE_PROJECT_ID in the AI Studio Secrets panel.');
}

client
    .setEndpoint(endpoint)
    .setProject(projectId || 'not-configured');

export const account = new Account(client);
export const databases = new Databases(client);
export { client, isConfigured };
