import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = 'Fan51236688';
  const hash = await bcrypt.hash(password, 12);
  console.log('Password:', password);
  console.log('Hash:', hash);
}

generateHash().catch(console.error); 