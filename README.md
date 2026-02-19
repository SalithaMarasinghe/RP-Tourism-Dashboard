# Tourism Analytics Dashboard

## ⚠️ IMPORTANT: API Configuration Required

### Get a Gemini API Key
The chatbot feature requires a Google Gemini API key:

1. Visit [https://ai.google.dev](https://ai.google.dev)
2. Click "Get API Key" and sign in with your Google account
3. Create a new API key
4. Copy the key and paste it into `frontend/.env.local`

## Backend Setup

1. Install Python dependencies:
   ```bash
   python -m pip install -r requirements-simple.txt
   ```

2. Start the backend server:
   ```bash
   cd backend
   python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

   The backend will be available at `http://localhost:8000`

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Configure API Key:
   - Create or edit `frontend/.env.local`
   - Add your Gemini API key:
     ```
     REACT_APP_GEMINI_API_KEY=your_api_key_here
     ```

3. Install dependencies and start:
   ```bash
   npm install
   npm start
   ```

   The frontend will be available at `http://localhost:3000`

## Features

✅ Tourism predictions and forecasting
✅ Real-time chat assistant with AI (Gemini)
✅ Web search integration for current tourism information
✅ Attractions and landmarks information
✅ Tourism analytics and reports

## Troubleshooting

### "Web search endpoint failed with status: 404"
- Make sure the backend is running on `http://localhost:8000`
- Check that you're using the latest version of the code

### "API key was reported as leaked"
- Your API key has been compromised
- Generate a new one at [https://ai.google.dev](https://ai.google.dev)
- Update the key in `frontend/.env.local`

### Chatbot not responding
- Verify your Gemini API key is valid and has sufficient quota
- Check browser console for detailed error messages
- Ensure backend is running for web search functionality
