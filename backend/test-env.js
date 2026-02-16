import dotenv from 'dotenv';
dotenv.config();

console.log('=== Environment Check ===');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
console.log('First 20 chars:', process.env.OPENAI_API_KEY?.substring(0, 20));

import('./services/aiService.js').then(module => {
  console.log('AI Service loaded');
  console.log('OpenAI client exists:', !!module.default.openai);
});
