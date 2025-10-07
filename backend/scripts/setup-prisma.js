const { execSync } = requ  // Try alternative approach
  console.log('🔄 Trying alternative approach...');
  try {
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Prisma client generated with retry!');
  } catch (error2) {
    console.error('💥 All attempts failed:', error2.message);
    console.log('📝 Manual fix: Run "scripts\\fix-prisma.bat" in backend folder');
    process.exit(1);
  }ocess');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Prisma client...');

try {
  // Remove Prisma cache if it exists
  const prismaPath = path.join(__dirname, '..', 'node_modules', '.prisma');
  if (fs.existsSync(prismaPath)) {
    fs.rmSync(prismaPath, { recursive: true, force: true });
    console.log('✅ Removed Prisma cache');
  }

  // Generate Prisma client
  console.log('🔄 Generating Prisma client...');
  execSync('npx prisma generate', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Prisma client generated successfully!');
} catch (error) {
  console.error('❌ Prisma setup failed:', error.message);
  
  // Try alternative approach
  console.log('🔄 Trying alternative approach...');
  try {
    execSync('npx prisma generate --force-reset', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Prisma client generated with force reset!');
  } catch (error2) {
    console.error('💥 All attempts failed:', error2.message);
    console.log('� Manual fix: Run "npx prisma generate" in backend folder');
    process.exit(1);
  }
}

console.log('🎉 Prisma setup completed!');