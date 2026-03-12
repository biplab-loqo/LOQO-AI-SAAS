# Loqo AI Studio - Frontend

Next.js frontend for the Loqo AI Studio platform - AI-Powered Screenplay to Visual Pipeline.

## Tech Stack
- Next.js 15.3.9
- React 19
- TypeScript
- Tailwind CSS
- Radix UI Components

## Environment Variables

Create a `.env.local` file:

```env
# Backend API URL (update with your Railway backend URL)
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app/api/v1

# Google OAuth Client ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID=621612224489-34b6rsceovl3jad7re8uoul724t3rhgr.apps.googleusercontent.com

# Static files URL (served by backend)
NEXT_PUBLIC_STATIC_URL=https://your-backend.up.railway.app/static
```

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

1. Import this repository to Vercel
2. Add environment variables (see above)
3. Deploy!

Vercel will automatically detect Next.js and configure build settings.

## Build

```bash
npm run build
npm start
```

## Project Structure

```
├── app/                  # Next.js app directory
│   ├── auth/            # Authentication pages
│   ├── dashboard/       # Dashboard pages
│   ├── project/         # Project management
│   └── ...
├── components/          # React components
├── context/            # React contexts (auth, theme)
├── hooks/              # Custom React hooks
├── lib/                # Utilities and API client
└── public/             # Static assets
```
