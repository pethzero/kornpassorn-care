const bcrypt = require('bcrypt');

async function generateHash() {
  const password = '123456';
  const saltRounds = 10;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Hashed Password:', hash);
    console.log('\nSQL Update Command:');
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'admin';`);
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateHash();
