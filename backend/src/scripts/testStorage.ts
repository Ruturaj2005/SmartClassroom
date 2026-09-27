process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dummy-jwt-secret-for-storage-test';

import { storageService } from '../services/storage';
import { calculateSHA256 } from '../utils/fileUtils';
import { config } from '../config/config';
import { Readable } from 'stream';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function runStorageTest() {
  const provider = config.storage.provider;

  console.log('\n============================================================');
  console.log('🧪 SmartClass Cloud Presentation Storage Diagnostic Test');
  console.log('============================================================');
  console.log(`Active Provider : ${provider.toUpperCase()}`);

  if (provider === 'r2') {
    console.log(`Bucket Name     : ${config.storage.r2.bucketName}`);
    console.log(`Account ID      : ${config.storage.r2.accountId ? '✓ configured' : '✗ MISSING'}`);
    console.log(`Access Key ID   : ${config.storage.r2.accessKeyId ? '✓ configured' : '✗ MISSING'}`);
    console.log(`Secret Key      : ${config.storage.r2.secretAccessKey ? '✓ configured' : '✗ MISSING'}`);
    console.log(`Public URL      : ${config.storage.r2.publicUrl || '(None - Using presigned URLs)'}`);
  } else if (provider === 'cloudinary') {
    console.log(`Cloud Name      : ${config.storage.cloudinary.cloudName ? '✓ configured' : '✗ MISSING'}`);
    console.log(`API Key         : ${config.storage.cloudinary.apiKey ? '✓ configured' : '✗ MISSING'}`);
    console.log(`API Secret      : ${config.storage.cloudinary.apiSecret ? '✓ configured' : '✗ MISSING'}`);
    console.log(`Folder          : ${config.storage.cloudinary.folder}`);
  } else {
    console.log(`Upload Directory: ${config.storage.uploadDir}`);
  }
  console.log('------------------------------------------------------------\n');

  // 1. Create a dummy presentation buffer (PDF structure)
  const dummyPdfContent = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n' +
    `% SmartClass Test Presentation Timestamp: ${Date.now()}\n%%EOF`
  );
  const originalHash = calculateSHA256(dummyPdfContent);
  const testKey = `test/diagnostic_${Date.now()}.pdf`;

  console.log(`1. Prepared test presentation : ${testKey} (${dummyPdfContent.length} bytes)`);
  console.log(`   SHA-256 Hash               : ${originalHash}`);

  try {
    // 2. Upload file
    console.log(`2. Uploading to ${provider.toUpperCase()}...`);
    const savedPath = await storageService.saveFile(dummyPdfContent, testKey, 'application/pdf');
    console.log(`   ✓ Upload succeeded. Saved path/key: ${savedPath}`);

    // 3. Verify existence
    console.log('3. Checking file existence in storage...');
    const exists = await storageService.fileExists(testKey);
    console.log(`   ✓ File exists in storage: ${exists}`);

    // 4. Retrieve Cloud URL
    console.log('4. Retrieving download / CDN URL...');
    const fileUrl = await storageService.getFileUrl(testKey);
    console.log(`   ✓ URL: ${fileUrl || '(Local storage - served via API)'}`);

    // 5. Download stream & integrity check
    console.log('5. Streaming file back from storage for integrity check...');
    const stream = await storageService.getReadStream(testKey);
    const downloadedBuffer = await streamToBuffer(stream);
    const downloadedHash = calculateSHA256(downloadedBuffer);

    console.log(`   Downloaded size: ${downloadedBuffer.length} bytes`);
    console.log(`   Downloaded hash: ${downloadedHash}`);

    if (downloadedHash === originalHash) {
      console.log('   ✓ SHA-256 integrity match! File was not corrupted.');
    } else {
      throw new Error(`Hash mismatch! Original: ${originalHash}, Downloaded: ${downloadedHash}`);
    }

    // 6. Cleanup test file
    console.log('6. Cleaning up test file...');
    await storageService.deleteFile(testKey);
    console.log('   ✓ Cleanup completed.');

    console.log('\n============================================================');
    console.log(`🎉 ALL CHECKS PASSED for ${provider.toUpperCase()} storage!`);
    console.log('============================================================\n');
  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message || error);
    if (provider === 'r2') {
      console.error('💡 Hint for R2: Check your R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.');
    } else if (provider === 'cloudinary') {
      console.error('💡 Hint for Cloudinary: Check your CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    }
    process.exit(1);
  }
}

runStorageTest();
