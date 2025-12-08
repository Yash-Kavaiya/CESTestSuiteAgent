const { openAsBlob } = require('node:fs');
const path = require('node:path');

const uploadFile = async () => {
  try {
    const filePath = path.join(__dirname, 'seed_test.csv');
    // Ensure Node version supports openAsBlob (v19.8+)
    const blob = await openAsBlob(filePath);

    // FormData is global in Node v18+
    const formData = new FormData();
    formData.append('file', blob, 'seed_test.csv');

    const response = await fetch('http://localhost:3001/api/v1/simulation/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${text}`);
    }

    const data = await response.json();
    console.log('Upload successful:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Upload failed:', error);
  }
};

uploadFile();
