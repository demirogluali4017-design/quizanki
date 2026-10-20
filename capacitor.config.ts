import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quizanki.app',
  appName: 'Quizanki',
  webDir: 'out',
  server: {
    // Canlı Vercel URL'ini buraya yaz. Örnek: https://quizanki.vercel.app
    url: process.env.CAPACITOR_SERVER_URL || 'https://quizanki.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
