import bcrypt from 'bcrypt';

async function testBcrypt() {
  const password = 'teste1234';
  console.log('Original password:', password);
  console.log('Password length:', password.length);
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log('Hashed password:', hashedPassword);
  console.log('Hash length:', hashedPassword.length);
  
  // Test comparison
  const result = await bcrypt.compare(password, hashedPassword);
  console.log('Comparison result:', result);
  
  // Test with various passwords that could have been used
  const possiblePasswords = ['teste1234', 'teste123', '1234', 'password', 'admin'];
  const dbHash = '$2b$10$DFHiHkBwWIY0U1LdXdOPUO3f0JgG3qyJ.BWt.fRB9PEqWdxhzQiOq';
  
  for (const testPass of possiblePasswords) {
    const result = await bcrypt.compare(testPass, dbHash);
    console.log(`Testing "${testPass}":`, result);
  }
}

testBcrypt().catch(console.error);