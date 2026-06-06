/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Charte PRISME QUIMPER (reprise du site vitrine)
        prisme: {
          dark: '#1A2639', // bleu nuit
          inner: '#0F1A2C', // bleu nuit profond
          deepest: '#02060D', // fond cosmique
          cream: '#FDF9F2', // crème clair
          base: '#E8E5DF', // texte clair
          gold: '#E5C37A', // or vif
          'gold-mat': '#B89754', // or mat
          accent: '#4A658A', // bleu accent
        },
      },
      fontFamily: {
        serif: ['Baskerville', 'Georgia', '"Times New Roman"', 'serif'],
        sans: ['Montserrat', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 0 20px rgba(229, 195, 122, 0.25)',
        card: '0 10px 30px rgba(2, 6, 13, 0.35)',
      },
    },
  },
  plugins: [],
}
