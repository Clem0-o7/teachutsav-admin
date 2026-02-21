import { BlobServiceClient } from '@azure/storage-blob';

// Azure Blob Storage configuration
const connectionString = process.env.CONNECTIONSTRING;
const containerName = process.env.CONTAINERNAME;

let blobServiceClient;

if (connectionString) {
  blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
}

/**
 * Upload file to Azure Blob Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original filename
 * @param {string} category - 'tech' or 'nontech'
 * @param {string} eventName - Event name for folder organization
 * @param {string} fileType - 'poster' or 'rulebook'
 * @returns {Promise<string>} - Blob URL
 */
export async function uploadToBlob(fileBuffer, fileName, category, eventName, fileType) {
  try {
    if (!blobServiceClient) {
      throw new Error('Azure Blob Storage not configured');
    }

    // Sanitize event name for folder structure
    const sanitizedEventName = eventName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Create blob path: category/eventName/fileType/filename
    const blobPath = `${category}/${sanitizedEventName}/${fileType}/${fileName}`;
    
    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Get blob client
    const blobClient = containerClient.getBlobClient(blobPath);
    const blockBlobClient = blobClient.getBlockBlobClient();
    
    // Determine content type
    const contentType = getContentType(fileName);
    
    // Upload the file
    const uploadResponse = await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });
    
    if (uploadResponse.errorCode) {
      throw new Error(`Upload failed: ${uploadResponse.errorCode}`);
    }
    
    return blobClient.url;
  } catch (error) {
    console.error('Blob upload error:', error);
    throw error;
  }
}

/**
 * Delete file from Azure Blob Storage
 * @param {string} blobUrl - Full URL of the blob to delete
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteFromBlob(blobUrl) {
  try {
    if (!blobServiceClient || !blobUrl) {
      return false;
    }

    // Extract blob name from URL
    const url = new URL(blobUrl);
    const blobName = url.pathname.substring(`/${containerName}/`.length);
    
    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Get blob client and delete
    const blobClient = containerClient.getBlobClient(blobName);
    const deleteResponse = await blobClient.delete();
    
    return !deleteResponse.errorCode;
  } catch (error) {
    console.error('Blob delete error:', error);
    return false;
  }
}

/**
 * Get content type based on file extension
 * @param {string} fileName - File name
 * @returns {string} - Content type
 */
function getContentType(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  const contentTypes = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
  };
  
  return contentTypes[extension] || 'application/octet-stream';
}