# Surgery Preference Log

A shared web app for general surgery residents to log attending preferences, procedure resources, and generate op note boilerplates.

## Setup

### Environment Variables
Create a `.env` file in the root with:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Vercel Deployment
Set the above environment variables in your Vercel project settings under Settings → Environment Variables.

## Features
- Attending preference notes per procedure
- Shared procedure resource library (videos, atlas, guidelines)
- Op note boilerplate generator
- Custom procedure management
- Export / Import for backups
