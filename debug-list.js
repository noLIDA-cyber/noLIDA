const { listAuthorizationCodes } = require('./server/services/authorizationCodeService.js');

async function test() {
  try {
    const result = await listAuthorizationCodes({});
    console.log('Success:', result.data.length, 'codes');
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();
