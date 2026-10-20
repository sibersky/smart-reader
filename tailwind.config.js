// simply_new/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
      "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
      "./src/Layouts/**/*.{js,ts,jsx,tsx}", 
      './node_modules/@teacher-alex-com/ui/**/*.{js,ts,jsx,tsx}',
    ],
  
    // Optional: Only needed for landing_page specific overrides/extensions
    theme: {
      extend: {
      },
    },
  
    // Optional: Only needed for landing_page specific plugins
    plugins: [
    ],
  };