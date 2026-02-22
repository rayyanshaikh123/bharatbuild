// Upload APK to Vercel Blob Storage
// Run: node scripts/upload-apk.js

const { put } = require('@vercel/blob');

async function uploadAPK() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (!token) {
    console.error('❌ Error: BLOB_READ_WRITE_TOKEN not found in environment variables');
    console.log('📝 Get your token from: https://vercel.com/dashboard/stores');
    process.exit(1);
  }

  try {
    const fs = require('fs');
    const path = require('path');
    
    const apkPath = path.join(__dirname, '..', 'public', 'bharatbuild-app.apk');
    
    if (!fs.existsSync(apkPath)) {
      console.error('❌ Error: APK file not found at:', apkPath);
      process.exit(1);
    }

    console.log('📤 Uploading APK to Vercel Blob...');
    console.log('📦 File:', apkPath);
    
    const fileBuffer = fs.readFileSync(apkPath);
    const blob = new Blob([fileBuffer], { type: 'application/vnd.android.package-archive' });

    const result = await put('bharatbuild-app.apk', blob, {
      access: 'public',
      token: token,
    });

    console.log('✅ Upload successful!');
    console.log('🔗 Public URL:', result.url);
    console.log('\n📝 Update your app/page.tsx with this URL:');
    console.log(`   href="${result.url}"`);
    
    return result;
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

uploadAPK();
